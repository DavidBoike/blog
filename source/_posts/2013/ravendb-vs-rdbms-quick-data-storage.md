---
layout: post
date: 2013-01-17
title: 'RavenDB vs. RDBMS: Quick Data Storage'
permalink: ravendb-vs-rdbms-quick-data-storage
categories:
- Development
tags:
- RavenDB
- SQL Server
- RDBMS
comments: true
---
*Recently [Charlie Barker](http://www.dualbotic.com/DB/blog/) ([@Porkstone](https://twitter.com/porkstone) on Twitter) asked me what I felt were pros and cons of using RavenDB over a standard relational database. In this series of posts I highlight the differences between RavenDB and a RDBMS that I have experienced after completing three projects that incorporate Raven in some capacity.*

 RavenDB was built for quick data storage. It promises zero-friction data storage and it definitely delivers. SQL Server, on the other hand, promises that you're probably going to need some form of object-relational mapping software.

One of the projects in which I used Raven began its life backed by SQL Server 2008. The problem was that it was always my lowest priority, getting just a few hours of attention each week before some bigger fish raised its head and had to be fried. In that short time each week in which I worked on the SQL version of the project, usually I would spend my time banging my head against SQL Server trying to just deal with the data access. There was very little forward progress on the actual business logic of the application.

<!-- more -->

I begged and pleaded with my manager to switch to RavenDB so that we could take advantage of the zero-friction data storage. At first he was resistant, but after a lot of very persistent lobbying on my part, he relented. I spent just 2 days converting the entirety of the application to Raven. This wasn't without hurdles, obviously, but those hurdles were because of things that SQL Server had forced me to do that I had to simplify and revert to an easier, *more intuitive* form in order to work with Raven.

My Visio entity relationship diagram just *barely* fit on one printed page (I hate referring to multiple page database diagrams) but it was shrunk down to a font size where people without perfect vision would have had a hard time with it. I would say on the order of 30-40 tables and the entire application hadn't been scoped out yet. I was blown away with how entire regions of the diagram, sometimes upwards of 6-8 tables, converted to one document in Raven.

**In SQL Server, you spend all your time figuring out how to cram square data into round holes (we call it normalizing to make it sound less distasteful) and then you spend all your time dealing with the ramifications of those decisions. In RavenDB, you instead spend your time deciding what data should be transactionally bundled together, and then store it however it makes sense.**

I'm also a student of Udi Dahan's Service Oriented Architecture, and this change in world-view (from rows and columns to transactionality of data) dovetails perfectly with everything Udi teaches. That in itself has value, because if you think this way upfront, then you're more likely to create an architecture that won't grow and mutate into an unmaintainable Big Ball of Mud later on.

In the next post, I'll explore data aggregation using Raven and SQL Server.
