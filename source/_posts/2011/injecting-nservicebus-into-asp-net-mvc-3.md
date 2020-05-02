---
layout: post
date: 2011-02-27
title: Injecting NServiceBus into ASP.NET MVC 3
permalink: injecting-nservicebus-into-asp-net-mvc-3
categories:
- Development
tags:
- NServiceBus
- source code
- MVC
- ASP.NET MVC3
- dependency injection
comments: true
---
In the past, integrating NServiceBus into a web application typically meant adding the fluent configuration block to the Global.asax file and then keeping a static reference to the IBus property, because ASP.NET has not been very friendly to dependency injection.

In ASP.NET MVC 3, Microsoft has changed that by adding some nice abstractions around dependency resolution.  With a little effort, this allows us to inject NServiceBus (and its dependency injection container) into the dependency resolution pipeline.

In this example, I will show how to add NServiceBus to an MVC 3 web application so that common NServiceBus types (IBus chief among them) are injected into your controller classes.

*Note: Karl Nilsson has written a post extending this one, showing how to [inject NServiceBus into an ASP.NET MVC4 Web API solution](http://coderkarl.wordpress.com/2012/03/16/injecting-nservicebus-into-asp-net-webapi/), which requires just a few minor adjustments.*

<!-- more -->

## IDependencyResolver

 ASP.NET MVC uses the IDependencyResolver interface to resolve types into implementation classes.  The first thing we will need to do is write a very quick adapter that will refer all requests to an underlying NServiceBus IBuilder instance.

    public class NServiceBusResolverAdapter : IDependencyResolver
    {
        private IBuilder builder;
        public NServiceBusResolverAdapter(IBuilder builder)
        {
            this.builder = builder;
        }
        public object GetService(Type serviceType)
        {
            return builder.Build(serviceType);
        }
        public IEnumerable GetServices(Type serviceType)
        {
            return builder.BuildAll(serviceType);
        }
    }

Under the hood, IBuilder is another abstraction for the dependency injection container used by NServiceBus. This is currently Spring, but in a future version will be changed to Autofac, although as an NServiceBus developer you can change the container to just about anything you want. This is one of the strengths of NServiceBus.

If NServiceBus doesn't have a registration for a given type, it will return null. This is good, because MVC will assume (correctly) that if you don't provide an implementation for a type that it should do whatever it would have done by default. This means we don't have to cover every type under the sun, only the ones we really care about.

Keep in mind that creating the class doesn't really do anything yet - we will have to register it later. But first, we need another puzzle piece.

## IControllerActivator

 What we're really after is injecting properties into our controllers, and for that, we need the assistance of a controller activator.

        public class NServiceBusControllerActivator : IControllerActivator
        {
            public IController Create(RequestContext requestContext, Type controllerType)
            {
                return DependencyResolver.Current
                     .GetService(controllerType) as IController;
            }
        }

MVC uses a controller activator to retrieve a specific controller class. With our controller activator in the pipeline, we can use NServiceBus's container to instantiate that controller, giving us the chance to inject our properties. Again, this just creates the class. We still need to register it with the system in the next step.

## Configuration Class

 This static class provides an extension to the NServiceBus fluent configuration that will allow us to register our dependency resolver and controller activator.

        public static class ConfigureMvc3
        {
            public static Configure ForMVC(this Configure configure)
            {
                // Register our controller activator with NSB
                configure.Configurer.RegisterSingleton(typeof(IControllerActivator),
                    new NServiceBusControllerActivator());
                // Find every controller class so that we can register it
                var controllers = Configure.TypesToScan
                    .Where(t => typeof(IController).IsAssignableFrom(t));
                // Register each controller class with the NServiceBus container
                foreach (Type type in controllers)
                    configure.Configurer.ConfigureComponent(type, ComponentCallModelEnum.Singlecall);
                // Set the MVC dependency resolver to use our resolver
                DependencyResolver.SetResolver(new NServiceBusResolverAdapter(configure.Builder));
                // Required by the fluent configuration semantics
                return configure;
            }
        }

## NServiceBus Startup

 With this all created, now we can start up NServiceBus in the Application\_Start() method of the MvcApplication class.

    protected void Application_Start()
    {
        // These lines are stock from the MVC Application project template
        AreaRegistration.RegisterAllAreas();
        RegisterGlobalFilters(GlobalFilters.Filters);
        RegisterRoutes(RouteTable.Routes);
        // Here is our NServiceBus fluent configuration
        Configure.WithWeb()
            .DefaultBuilder()
            .ForMVC()    // <------ here is the line that registers everything
            .Log4Net()
            .XmlSerializer()
            .MsmqTransport()
                .IsTransactional(false)
                .PurgeOnStartup(false)
            .UnicastBus()
                .ImpersonateSender(false)
            .CreateBus()
            .Start();
        // We don't have to store the IBus that results from .Start() because it will
        // be injected into all of our controllers for us.
    }

Now if you edit your HomeController (assuming you're using the MVC 3 sample application):

    public class HomeController : Controller
    {
        // Add the Bus property to be injected
        public IBus Bus { get; set; }
        public ActionResult Index()
        {
            // Let's see what gets injected
            ViewBag.Message = String.Format("Welcome to ASP.NET MVC! Bus is '{0}'.",
                Bus.GetType().FullName);
            return View();
        }
        public ActionResult About()
        {
            return View();
        }
    }

This is what you should see:

![MVC with NServiceBus](/images/MvcScreenshot1.png)

## Conclusion

 This example shows how to gain NServiceBus property injection for all of our controller classes. We could easily add this to other types, if needed, by finding how those types are activated and inserting NServiceBus into their creation in the same way.
