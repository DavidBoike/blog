---
layout: post
date: 2010-03-29
title: NServiceBus a solution for load-balancing console applications?
permalink: nservicebus-a-solution-for-load-balancing-console-applications
categories:
- Development
tags:
- NServiceBus
- load balancing
comments: true
---
One of the most frustrating things to me as a software architect is evaluating a new technology for a new project, and getting the feeling in my gut that if properly applied, this new technology could solve a lot of problems, if only I had the time to fully study it and do a lot of research and development. But, I'm working on a project, and that project has a deadline, and I know it won't happen. So instead of being unhappy with my code after finding it a year or two later (as should be the case, or you're not learning) I'm going to be unhappy with it *nearly immediately*.

I'm facing a project where I need to build a highly scalable background processing service. Of course, it should be load balanced, so that maintenance can be performed on the host servers, and moreover, an architecture that allows me to scale it by applying more instances on more servers (or even more instances in the cloud) will provide me with the ultimate in scalability potential.

This is easy with a web application. We have a load balancer, and it's very good at what it does. A web application just listens for and then processes requests. If you take it off the load balancer it will get no requests. Easy.

This is a lot more convoluted for back-end processes. It doesn't necessarily sit back and wait for requests. It does things of its own volition. This means if there are more than one process, there needs to be some concept of who is in charge. Heartbeats between applications to know who else is alive and who is dead. And how is dead or alive defined? The fact that the server will respond to a request on port 80 will no longer cut it.

I'm currently evaluating [NServiceBus](http://www.nservicebus.com/) and I have to say at first blush, it's pretty impressive. I like how it essentially turns a console process into a bunch of handlers waiting for events - a lot like a web application actually, which would make it easier to load balance. If events get fed into distributors, and then multiple instances can retrieve work out of that work queue, then it makes it more straightforward - an instance will either be active and retrieving work, or it will be inactive and the other instances will make up for it, and more instances can be brought online to help scale out.

But that doesn't completely eliminate the problem of having a master or lead process. This application, for example, needs to start its work on a schedule. If 3 processes are running, one needs to be in charge and say when to start processing on a piece of work. After that one event, the NServiceBus message handling infrastructure can take care of the rest of the scaling.

Hopefully I'll figure this out before it's too late for this project. If so, I'll come back and link to it here.
