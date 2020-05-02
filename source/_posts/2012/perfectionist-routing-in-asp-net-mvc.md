---
layout: post
date: 2012-07-02
title: Perfectionist Routing in ASP.NET MVC
permalink: perfectionist-routing-in-asp-net-mvc
categories:
- Development
tags:
- source code
- MVC
- C#
- reflection
- Routing
comments: true
---
I’m not one to accept `/{ControllerName}/{ActionName}` for my routes. [Like a few members of the Stack Exchange team](http://kevinmontrose.com/2011/07/25/why-i-love-attribute-based-routing/), I’m far too anal retentive about my routes to let Microsoft just handle it for me.

To this end, I use the excellent [Attribute Routing project](https://github.com/mccalltd/AttributeRouting) which is also [available on NuGet](http://nuget.org/packages/AttributeRouting): just type Install-Package AttributeRouting into the Package Manager and you’re ready to decorate your methods with route attributes like this:

<!-- more -->

    [GET("some-action/{id}")]
    public ActionResult SomeActionMethod(int id)
    {
        return View();
    }

  

A lot more than this is possible; for more details check out the [AttributeRouting project wiki](https://github.com/mccalltd/AttributeRouting/wiki). Another nice feature during development time is the additional route “\~/routes.axd” which shows you, in order, all the routes registered in your application (not just those registered by attributes) and gives you a lot of information that’s very helpful when debugging a routing problem.

All the benefits of attribute based routing aside, the problem quickly becomes that pesky default route. If you accidentally misspell a controller or action name in an ActionLink or other helper, you will get a URL that uses that default path due to this entry in the routes configuration in the Global.asax.cs:

    routes.MapRoute(
        "Default", // Route name
        "{controller}/{action}/{id}", // URL with parameters
        new { controller = "Home", action = "Index", id = UrlParameter.Optional } // Parameter defaults
    );

  

I don’t want my ActionLinks to use this default route. If it does, they’re wrong! I want to find out through an exception that I can easily detect during development, not by silently outputting a route that doesn’t work.

So why not just get rid of the default route? Not so fast. If you do that, when you try to use the HtmlHelper’s RenderAction extension method, you’ll get the following exception:

> **System.InvalidOperationException**: No route in the route table matches the supplied values.

 When you call out to that child action, the system is looking in the routing table to figure out which controller and action to send the request to. The fact that no route URL is necessary (or even applicable) for a child action really doesn’t matter at all. I haven’t reflected deeply enough to confirm this, but it feels like the child action features of MVC were bolted on in one of the later releases of MVC (either Version 2 or 3 – I didn’t start using the framework until MVC 3.)

In any case, it is possible to circumvent this problem and get exceptions thrown on unknown routes. To do it requires a 2-step process:

1.  Add mappings for all child routes (identified by the [ChildActionOnly] attribute) in the route table.
2.  Add a final catch-all route that throws an exception when you try to use it.

## 

## Mapping Child Routes

 In order to map all child routes, you need to be militant about marking all your child-only actions (or entire child-action-only controllers) with the [ChildActionOnly] attribute, but I consider that to be good practice anyway. In fact, it would be an excellent idea to create a unit test to reflect all controllers and ensure they are either decorated with either a [ChildActionOnly] attribute or one of the AttributeRouting attributes. Perhaps I will demonstrate that in a future post.

Finding all the child actions just requires a little bit of reflection. This extension method makes it easy to reflect through all the controllers in a single assembly:

    public static void MapChildOnlyActionRoutesFrom(this RouteCollection routes, Assembly assembly)
    {
        foreach (Type t in assembly.GetTypes().Where(t => !t.IsAbstract && typeof(IController).IsAssignableFrom(t)))
        {
            bool allChildOnly = t.GetCustomAttributes(typeof(ChildActionOnlyAttribute), true).Any();
            foreach (MethodInfo m in t.GetMethods())
            {
                if (m.IsPublic && typeof(ActionResult).IsAssignableFrom(m.ReturnType))
                {
                    if (allChildOnly || m.GetCustomAttributes(typeof(ChildActionOnlyAttribute), true).Any())
                    {
                        string controller = t.Name;
                        string action = m.Name;
                        if (controller.EndsWith("Controller"))
                            controller = controller.Substring(0, controller.Length - 10);
                        string name = String.Format("ChildAction/{0}/{1}", controller, action);
                        var constraints = new
                        {
                            controller = controller,
                            action = action
                        };
                        routes.MapRoute(name, String.Empty, null, constraints);
                    }
                }
            }
        }
    }

  

One area for improvement would be handling asynchronous controller actions, where matching ActionNameAsync and ActionNameCompleted methods would need to be identified, where the first would be marked with the attribute and return void, and the second would not be decorated but return the ActionResult.

## Catch-All Route

 Next, we just need the catch-all route to throw exceptions on unknown routes, which is implemented as a class inheriting from Route and an extension method to enable it to be easily applied in the Global.asax.cs:

    public static void MapCatchAllErrorThrowingDefaultRoute(this RouteCollection routes)
    {
        routes.Add("Default", new RestrictiveCatchAllDefaultRoute());
    }
    public class RestrictiveCatchAllDefaultRoute : Route
    {
        public RestrictiveCatchAllDefaultRoute()
            : base("*", new MvcRouteHandler())
        {
            DataTokens = new RouteValueDictionary(new { warning = "routes.MapCatchAllErrorThrowingDefaultRoute() must be the very last mapped route because it will catch everything and throw exceptions!" });
        }
        public override VirtualPathData GetVirtualPath(RequestContext requestContext, RouteValueDictionary values)
        {
            string valueDebug = String.Join(String.Empty, values.Select(p => String.Format("\r\n{0} = {1}", p.Key, p.Value)).ToArray());
            throw new InvalidOperationException("Unable to find a valid route for the following route values:" + valueDebug);
        }
    }

  

Note the DataTokens, which is visible in AttributeRouting’s route debugging handler, that reminds you that it must be the last route.

Then, just apply these both in the Global.asax.cs:

    public static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
        routes.MapChildOnlyActionRoutesFrom(typeof(MvcApplication).Assembly);
        //Make sure this is the last route you add!
        routes.MapCatchAllErrorThrowingDefaultRoute();
    }

  

You don’t see anything about AttributeRouting in here – this is because it handles its bootstrapping in a file added to the application’s App\_Start directory by the NuGet install process.

With this in place, the calls to RenderAction now work, and when you fat-finger an ActionLink, you get an exception like this:

> Unable to find a valid route for the following route values:
>
> action = NonexistantAction
>
> controller = NonexistantController

 Actually helpful! Any regression testing (or even unit testing on views) should be able to catch this.

With this information in hand, have fun being just as anal-retentive about your routes as I am!
