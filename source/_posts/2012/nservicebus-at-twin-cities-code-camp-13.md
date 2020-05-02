---
layout: post
date: 2012-10-06
title: NServiceBus at Twin Cities Code Camp 13
permalink: nservicebus-at-twin-cities-code-camp-13
categories:
- Development
tags:
- NServiceBus
- source code
- Twin Cities Code Camp
- NuGet
comments: true
---
Today I had a great time presenting Enterprise Service Bus Development with NServiceBus at the Fall 2012 [Twin Cities Code Camp](http://www.twincitiescodecamp.com/TCCC/Default.aspx). I wasn’t sure before presenting if we would have enough time to get into sagas, and as it turned out, we ran out of time right in the middle!

So as promised, I finished the saga code and pushed it all to GitHub. Here is the link to my [Twin Cities Code Camp 13 NServiceBus Example Code](https://github.com/DavidBoike/TCCC13Demo). Please feel free to clone it and explore!

<!-- more -->

## Review: Session Rundown

 Just to review, here is what we did in the session:

-   We created a bare-bones MVC 3 site with JSON only just for testing, added the NServiceBus NuGet package, and self-hosted NServiceBus through the ServiceBus class, so that we have easy access to the Bus instance as a public static variable.
-   We created a UserService.Messages assembly to contain our command and event classes, added the NServiceBus NuGet package (for the ICommand and IEvent marker interfaces, more on that later!) and set up directories for our Commands and Events.
-   We created a UserService assembly to be our user service endpoint, added the NServiceBus.Host NuGet package, and created an IConfigureThisEndpoint class, configuring the endpoint AsA\_Publisher.
-   We created a CreateUserCmd and sent it from the MVC site to the UserService endpoint, to see how easy it is to send a message to the service layer and then publish an event.
-   We created a new EmailSender endpoint and subscribed to the user created event which would send an email (no doubt super-spammy) to the user, showing how easy it is to add existing functionality to a system without having to redeploy the existing code.
-   We deliberately caused an exception in one of our message handlers, to see how messages get retried, and then go through the process of second-level retries, before finally going to the error queue. Then we fixed that code and saw how easy it was to send it back with the ReturnToSourceQueue tool.
-   We decided to version the user created event to add a timestamp. We saw that even though we were now publishing a different message type, the existing subscribers did not need to be touched and kept working. We discussed how it was a good practice to use interfaces for event definitions because it enables you to easily version them, including the possibility for multiple inheritance.
-   We decided to enable message handlers in the MVC app and create a handler that would keep track of the last 10 users created in a queue. This enables a feature like [phpBB](https://www.phpbb.com/) that shows the most recent user(s) to have joined the site. We discussed how in a web farm, each web application instance will receive its own copy of the message so they will all get the same information and keep it in memory. We discussed how directly after a web server recycle, there would be no information, and how it’s important to discuss situations like this with the business, because more than likely they’ll be ok with it. Or more to the point, they won’t want you to expand scope enough to handle that instance.

 That was as far as we got during the session. We barely got started on a Saga and then we ran out of time.

Based on the direction during the session, I decided to have the example saga follow a workflow like this:

-   Once a user is created, some sort of certificate has to be generated for them.
-   3 other related but separate tasks (for brevity) have to be accomplished. These tasks could represent all sorts of activities, such as:
    -   Contact a web service for an external CRM system to notify them of the new user.
    -   Send an email to management, or client services, or whomever.

-   Once all four of these things have been completed, publish a new event to announce that all user setup tasks have been completed.

 In order to accomplish this:

-   I created a Saga class, and a SagaData class.
-   I created processors for creating a user certificate, and for doing the Other Tasks, including commands to start the process, and event to announce that the process is complete.
-   I specified that our Saga is started by our user created event using the IAmStartedByMessages marker interface.
-   I specified that our Saga processes the Certificate/OtherTask processor events using the same IHandleMessages interface that we use for normal message handlers.
-   I implemented the Saga base class’s ConfigureHowToFindSaga method to show the Saga how to find the Saga for the Certificate/OtherTask events by matching up the UserId in the message with the UserId in the Saga Data. The framework takes care of actually managing the storage.
-   I implemented the Saga handler for the user created event. When processing it, the Saga will set up its SagaData with information from the message, and then Send() the messages to start the Certificate/OtherTask processes.
-   I implemented handlers for the Certificate/OtherTask completed events. Note that we have NO IDEA which ones will arrive in what order. Even if they completed in a certain order, MSMQ does not guarantee message delivery order! So on each handler we must update the Saga Data and then evaluate if all processing is complete so we can decide whether we are done.
-   I published a new event to announce that the Saga was done, and created another handler to consume it just to show completeness.

#### Important – Sagas, Events, and Auto-Subscription

 In Version 2.0, a Saga would not automatically subscribe to any event messages that it processes. The reasons are really somewhat immaterial now, as in Version 3.0, this has been changed, as it was a *frequent* cause of confusion.

However, in this example we have been cheating by putting so much functionality in one endpoint. I did this in the presentation just for speed, because you didn't want to watch me create a bunch of new projects. Normally the processors that did the extra Certificate/OtherTask work would be over in other endpoints. Otherwise, what is the point of using events to decouple them if they're going to be tightly coupled in the same assembly?

How this affects us here is that an endpoint **will normally NOT auto-subscribe to itself**. There is a fluent configuration option .AllowSubscribeToSelf() that is available after you do .UnicastBus(), but I tried that and that opened up a whole can of worms for me, in this example. All of a sudden the endpoint wanted details on everything that might happen, for features we weren't using. So, I decided it would be more straightforward to create a class, marked with IWantToRunAtStartup (neat name huh?) that manually subscribes the endpoint to the Saga events we mean to process.

You can see this in the UserSaga.cs file in the repository. I created an IWantToRuNAtStartup class, asked the IoC framework to inject a Bus instance, and manually subscribed to each of the three message types.

Keep in mind, **I only did this because we were cheating!** In normal circumstances, where your sagas and the events they process are separated in different endpoints, you shouldn't have to worry about this!

## Other things to think about

 Obviously I simplified some things for the purposes of a very quick demo, but there are ways that you can customize NServiceBus and make it easier to work with.

#### Unobtrusive Mode

 During the presentation I was marking commands and events with the ICommand and IEvent interfaces from the NServiceBus assembly. This works fine, but can get you into problems because of the necessary dependency taken on NServiceBus.dll.

It’s possible to avoid this by specifying conventions for the type scanner to find your message contracts. If you noticed during the presentation, I mentioned how it’s advantageous to keep your Commands and Events in those named directories – this is because it sets up Visual Studio to make your namespaces end with “.Commands” and “.Events” which creates a useful convention to use!

To learn more about this, check out the [Unobtrusive Mode](http://www.nservicebus.com/UnobtrusiveMode.aspx) page in the NServiceBus documentation.

#### Support for IoC injection in MVC Controllers

 During the presentation we used a ServiceBus static class to control our access to the Bus instance. It is much nicer to involve NServiceBus in MVC’s own dependency injection process so that you only need to add the IBus property to your controller class, and NServiceBus will fill it in for you the same way it does in a message handler class.

To accomplish this, check out [Using NServiceBus with ASP MVC 3](http://www.nservicebus.com/docs/Samples/AsyncPagesMvc3.aspx) in the NServiceBus documentation.

## Where to go from here?

 Want to learn more? Here are some links to get you started:

-   Clone the GitHub repository with the [source code from the session](https://github.com/DavidBoike/TCCC13Demo), in case you missed it up above.
-   The [NServiceBus Website](http://www.nservicebus.com/)
    -   The documentation has recently been updated for Version 3.
    -   Be sure to check out the [Videos](http://www.nservicebus.com/Videos.aspx) section!
    -   The best way to learn is to download NServiceBus and then go through the [many sample projects](http://nservicebus.com/Samples.aspx).

-   For Questions
    -   Ask any question on the Yahoo! Group for NServiceBus.
    -   Ask on Stack Overflow – just tag your question with NServiceBus.
    -   Twitter Hashtag: \#NServiceBus

-   Videos
    -   For another great intro to NServiceBus, check out Andreas Ohlund’s presentation [Death to the Batch Job](http://skillsmatter.com/podcast/home/death-batch-job/te-4548).
    -   For those interested in NServiceBus on Windows Azure, check out the video [Simplifying distributed application development with NServiceBus and the Windows Azure Platform](http://cloudshaper.wordpress.com/2011/10/19/video-simplifying-distributed-application-development-with-nservicebus-and-the-windows-azure-platform/).
    -   [Pluralsight now has a course on NServiceBus](http://blog.pluralsight.com/2012/10/03/video-put-your-messaging-on-the-nservice-bus/).

-   Formal Training
    -   [Training is available](http://www.udidahan.com/training/) specifically on NServiceBus. Another course that is available is Udi’s 5-day Advanced Distributed System Design (ADSD) course with SOA and DDD. It’s not specifically on NServiceBus but instead covers the SOA principles that led to its creation. I attended Udi’s ADSD course and it was *fantastic.*

