---
layout: post
date: 2017-03-17
title: Introduction to NServiceBus
permalink: introduction-to-nservicebus
comments: true
categories:
- Development
tags:
- NServiceBus
- book
- career
- announcements
---

<div style="float:right;margin:1em;">
<img src="/images/learning-nservicebus-cover-small.png" style="width:175px;height:213px;vertical-align:text-top;" />
<img src="/images/learning-nservicebus-2ndEd.jpg" style="border:solid 1px #999;width:162px;height:200px;vertical-align:text-top;box-shadow:6px 6px 5px #ddd" />
</div>

If you're looking at my blog right now (hint: you are) then you might already know that I am the author of [*Learning NServiceBus*](https://www.packtpub.com/application-development/learning-nservicebus) which focused on NServiceBus 4, and [*Learning NServiceBus - Second Edition*](https://www.packtpub.com/application-development/learning-nservicebus-second-edition) which focused on NServiceBus 5.

Now NServiceBus 6 has been released, and with the change to a fully async API, quite a bit has changed. In fact, enough has changed that if you tried to use my latest book, which is called *Learning NServiceBus*, to actually, you know, *learn NServiceBus*, it might not be the greatest experience in the world.

The problem is, writing books sucks. A lot. So I'm not doing that anymore.

<!-- more -->

## What's wrong with books?

To publish a book you spend countless hours, writing, editing, rewriting, editing, proofing, proofing some more, then proofing again. By the time you get done and you get the physical copy of the book in your hands, you really don't want to look at that content probably ever again. So when the first version of my book was published, and my copies arrived in the mail, here's what I did: I cracked one open *just to make sure there were actually words in it*, and then I closed it and put every single copy on my bookshelf.

I seriously did not want to look at those words one more time. I stopped.

But NServiceBus didn't stop. NServiceBus just kept going. By the time my book was published, NServiceBus 4 had already been out for a month and a half. Within another two months, NServiceBus 4.1 was out. Then 4.2, and so on. Each release made my book a little more wrong.

Just a bit over a year after I published, NServiceBus 5 was released, making my book *completely wrong*. I figured that, at the very least, updating the book to a new major version would require much less effort than went into the first version.

Well, I was wrong. Granted, I didn't just update the code samples and call it a day, because I wanted the book to be the best it could possibly be. Although I didn't keep track of hours, I'm fairly certain that the updated took every bit as much effort as the one that came before.

And here we are again. Now that NServiceBus 6 has been released, the second book is also completely wrong. Putting words to *actual paper* is just no good way to actually educate people how to use a software product that's changing and evolving.

So now that I have the advantage of working direclty for the [makers of NServiceBus](https://particular.net), we've decided to go in a bit of a different direction. I've been working on a new [Introduction to NServiceBus](https://docs.particular.net/tutorials/intro-to-nservicebus/) tutorial, hosted within our documentation site. That means we'll be able to keep the tutorial up-to-date and relevant using the same tech we use for our documentation and samples, in a way a paper book could never hope to accomplish.

## The new tutorial

I designed the new tutorial as a series of 5 lessons, each designed to be accomplished in a half hour or less. The tutorial teaches the basics of working with NServiceBus but a lot more than that as well. It also covers the messaging theory to help you get your NServiceBus projects off on the right foot.

Each lesson contains an exercise that guides you through each step of creating a sample messaging system in the retail/ecommerce domain. By the end of the tutorial, you'll have 4 messaging endpoints all exchanging messages with each other, and also learn how to use the tools in the Particular Service Platform to replay messages when the system suffers from temporary failures.

When complete, the system you build will look something like this:

[<img src="/images/intro-to-nsb-tutorial-diagram.svg" style="border:solid 1px #ccc;padding:1em;" />](https://docs.particular.net/tutorials/intro-to-nservicebus/)

Sound interesting? If so, give the [**Introduction to NServiceBus**](https://docs.particular.net/tutorials/intro-to-nservicebus/) tutorial a try, and then ping me on Twitter [@DavidBoike](https://twitter.com/DavidBoike) to let me know what you think.

The first tutorial is introductory, and introduces the concepts of messaging, sending messages, and using Publish/Subscribe. I would love to build additional tutorials in the future that will extend on this, showing how to organize NServiceBus projects, centralize repeated configuration, and show how to get the most out of NServiceBus Sagas. Let me know if you'd be interested in that as well!
