---
layout: post
date: 2013-10-28
title: InjectRouteData ActionFilter for ASP.NET MVC
permalink: injectroutedata-actionfilter-for-asp-net-mvc
excerpt: "If you really want to take control of your ASP.NET routes to create a RESTful  or at least RESTish URL naming scheme, first you need to let go of default MVC convention-based  routes (Controller&#47;Action&#47;{id}) and use something like AttributeRouting.  (AR is now half-baked  into MVC 5, unfortunately without some of the more useful things AttributeRouting  has to offer, like the ~&#47;routes.axd  route debugging handler.)\r\n\r\nIn any case, once you use either method  of getting attribute routes, you&rsquo;re now faced with how to integrate that data  in your controllers. The first step is to put a RoutePrefix attribute on your controllers,  but then to get that data out, you have to scrape the data out of the RouteData  manually within your action method, or override OnActionExecuting to do the same  except drop the values in an instance variable.\r\n\r\n"
categories:
- Development
tags:
- source code
- MVC
- Routing
- ActionFilter
comments: true
---
If you really want to take control of your ASP.NET routes to create a RESTful or at least RESTish URL naming scheme, first you need to let go of default MVC convention-based routes (Controller/Action/{id}) and use something like [AttributeRouting](http://attributerouting.net/). (AR is now [half-baked into MVC 5](http://blogs.msdn.com/b/webdev/archive/2013/10/17/attribute-routing-in-asp-net-mvc-5.aspx), unfortunately without some of the more useful things AttributeRouting has to offer, like the [\~/routes.axd route debugging handler](http://attributerouting.net/#debugging).)

In any case, once you use either method of getting attribute routes, you’re now faced with how to integrate that data in your controllers. The first step is to put a RoutePrefix attribute on your controllers, but then to get that data out, you have to scrape the data out of the RouteData manually within your action method, or override OnActionExecuting to do the same except drop the values in an instance variable.

In any case, it shouldn’t be that hard. This is something that should be handled at the infrastructure level, so let’s look at how to do that via an InjectRouteData ActionFilter attribute:

<script src="https://gist.github.com/7203662.js?file=InjectRouteDataAttribute.cs"></script>

Now that we have this ActionFilter in place, we can have these values injected directly into member variables or properties in our controller. This is a neat trick, but of course we could just let MVC do its thing and ask for the value in any controller by adding it as a parameter to the action method, right? Sure, but the injection gives us the ability to do things like this:

<script src="https://gist.github.com/7203662.js?file=ExampleController.cs"></script>

This way you don’t have to have the awkward repetitive code at the beginning of each action method getting the thing by its id, you just have the thing already available.

We’re making the assumption here that every single action method within the controller would have need for the value being injected and that it’s not a waste of time to go to the data store and get it. Also, you have to be careful that values injected in this way use some level of caching (at least within the HTTP request) and don’t go back to the data store multiple times for the same thing. Of course if you’re using an OR/M with enough smarts (or even better, RavenDB) then this is taken care of for you.

What is really nice is to take this pattern as a starting point and extend it to be specific to your domain, so that various well-known objects are automatically injected into your controllers based on the inclusion of their Id. For instance, the injection filter could be smart enough to inject a User object when a userId is present in the routing data. This could then be reused for all the controllers in your application that need to know about a User.
