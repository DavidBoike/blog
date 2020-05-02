---
layout: post
date: 2011-02-07
title: My NServiceBus moment of bliss
permalink: my-nservicebus-moment-of-bliss
categories:
- Development
tags:
- NServiceBus
- load balancing
comments: true
---
Sometimes technology is more than just technology.  Sometimes it reaches out and grabs you, and you have a moment of bliss where you realize everything has changed, that this is going to change *everything* and make your life better.

[LINQ](http://msdn.microsoft.com/en-us/library/bb308959.aspx) was one of those technologies for me.  Not the query-like syntax, per se; I consider that to be just a fancy compiler trick.  But the set of extension methods for IEnumerable and the way they can reduce a complex looping structure to a line or two is amazing and game-changing.

Over the last year I have been embracing [NServiceBus](http://www.nservicebus.com/).  [Jonathan Oliver](http://jonathan-oliver.blogspot.com/) describes NServiceBus as the best thing to happen to distributed systems since Ethernet, and he’s right on the money.  My first major project using NServiceBus has now been in production for a few months, and since then I’ve been reflecting on the process.

Now I realize there was one moment – that perfect moment of bliss – when I realized NServiceBus had changed everything.

<!-- more -->

## Before NServiceBus

Before I get to that, I should mention a project I undertook before NServiceBus.

A couple years ago I designed multithreaded e-mail sender.  Today it sends 2 million e-mails per month, only to users who have opted in, of course. It has specific business requirements, but at its core it takes a mailing, performs mail merges for thousands of users, separates the messages into batches, and then attempts to send those message batches out as fast as possible.

Today I know this cries out for NServiceBus.  But it doesn’t have NServiceBus.  The result is a maintenance nightmare, both for server maintenance and software upgrades.

There are no message queues.  Everything relies on the database as the source of truth, and in order to run as fast as possible, the round-trips to the database are kept to a minimum.  When a message batch is sent, all of the message rows for that batch are updated with the sender’s job ID, so no other sender will try to send out those messages.

Assuming everything goes well and no exceptions are thrown, one database call updates all of the messages from that job ID as having been sent.  If there are any exceptions, those are reported first- one at a time-and then the rest are marked as sent in the same way.

So in the middle of a message batch, state exists only in server memory.  The job ID is a Guid.  If the mail sender shuts down improperly in the middle of the batch, that job ID is lost, the batch is left in limbo, and a restarted service cannot pick up the pieces because the job ID is lost.  The mailing as a whole can never complete, and the only way it can ever clear out is via manual intervention in the database to requeue that job’s messages.  This may result in some of those users receiving double messages.

This doesn’t happen often, because we bend over backward to avoid it.  The application server can only be restarted after carefully inspecting the schedule of messages to be sent, looking for a lengthy break, just in case something were to go wrong.  This gets harder and harder as more clients are added.

And there’s no backup for this system.  And there’s no way to scale it out.

## How I Learned to Stop Worrying and Love the Bus

My new project was essentially a big RSS processing system.  I began investigating NServiceBus because I knew this system had the potential to grow to a point requiring horizontal scale-out.  I really approached NServiceBus just as a method of [load-balancing a console process](http://www.make-awesome.com/2010/03/nservicebus-a-solution-for-load-balancing-console-applications/) the same way I would load-balance a Web application.

An RSS processor as assembled with NServiceBus is a lot like an assembly line.  A feed is downloaded, and then split into its constituent items.  Each item is sent off to an item processor, where depending upon feed configuration, many things can happen.  Images may be downloaded and resized.  Referenced videos may be transcoded to different formats.  The system could really do anything with an item, depending on its configuration in the database.  A saga is responsible for waiting until all the items have been processed, at which point the feed is complete and other applications can be notified via events.  Above it all, a scheduler is responsible for watching over everything and commanding the feed to reprocess after a given timeout.

The real difficulty is there’s no way to predict how long a feed may take to process.  If it is straight text with minimal processing required, it could finish in seconds.  If it is media rich and full of videos that require transcoding, it could take an hour or more.  The scheduler must accept that it is processing and not try to requeue the feed while it is already being worked on.

Before NServiceBus, this would have been a recipe for disaster.  Once the scheduler marks the feed as in process, it has to accept that this is true.  If, further down the line, feed processing fails for some reason, that feed would become locked out.  Content would grow stale, customers would grow angry, and I would get a phone call.  I can’t stress enough how I absolutely **detest** phone calls.

My moment of NServiceBus bliss came shortly after launching the system, after customers had begun to enter their feeds and we were processing real data.  No matter how many edge cases you test for, it is apparently impossible to predict all of the ways in which customers will screw up an XML feed.

I don’t even remember what the error was, but it was caused by esoteric, weird, just plain wrong stuff in the client’s XML.  Stuff like RSS items having duplicate elements.  Who does that?

I started to panic a little bit.  My error queue was starting to fill up at a somewhat alarming rate.  I started slogging through the logs, looking for the exception messages.  For every exception that was a matter of improper client input, I added validation and reporting.  Every exception that was really a bug, I fixed.  I committed my code, my continuous integration server created a new build, and I installed it.

Then came the moment of truth.  I ran ReturnToSourceQueue.exe and began to pray that this NServiceBus thing had really been worth the time it had taken to learn.

And everything just worked … perfectly.

All of the feeds began processing right where they left off, and all of the feeds returned to the OK status.  All the proverbial lights were shining green.  I didn’t have to go into the database to manually fix things.

Ever since then I’ve been an NServiceBus acolyte.  I’m not sure if I ever would have been able to complete this project without it.

## Conclusion

I’m not sure if I’ll ever be able to go back and redesign my e-mail sender project, but I would very much appreciate the opportunity.  Instead of constant database queries to get a batch of messages to send, how nice would it be to create an NServiceBus message for each one, and then trust in eventual consistency that those messages will be delivered or arrive in an error queue?  The process could be scaled out to multiple machines, and if a process fails or a server needs to be restarted, those messages will still be waiting in MSMQ when the endpoint returns.

Jonathan Oliver is right.  NServiceBus is the best thing to happen to distributed systems since Ethernet.  Scalability, reliability, and maintainability cease being difficult to attain, and become commonplace.
