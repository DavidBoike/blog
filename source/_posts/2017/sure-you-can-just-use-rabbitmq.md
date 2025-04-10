---
layout: post
date: 2017-12-13
title: Sure, you can just use RabbitMQ
permalink: sure-you-can-just-use-rabbitmq
cover: /images/2017/rabbit-hawk.jpg
comments: true
categories:
- Development
tags:
- NServiceBus
- RabbitMQ
---

<i>Note: This post was adapted from an <a rel="canonical" href="https://stackoverflow.com/questions/47060893/what-are-advantages-of-using-nservicebus-rabbitmq-against-pure-rabbitmq">answer I originally posted to a Stack Overflow question</a>.</i>

People ask (frequently) why they need NServiceBus. "I've got RabbitMQ and that has built-in Pub/Sub," they might say. "Isn't NServiceBus just a wrapper around RabbitMQ? I could probably write that in less than a weekend. After all, *how hard could it be?*

Well sure, you can definitely just use pure RabbitMQ. I'll even help you get started writing that wrapper. You just have to keep a couple things in mind.

<!-- more -->

First you should read [Enterprise Integration Patterns](https://www.amazon.com/dp/0321200683/) cover to cover and make sure you understand it well. It is 736 pages, and a bit dry, but extremely useful information. It also wouldn't hurt to become an expert in all the peculiarities of RabbitMQ.

## Messaging

Then you just have to decide how you'll [define messages](https://docs.particular.net/nservicebus/messaging/messages-events-commands), how to [define message handlers](https://docs.particular.net/nservicebus/handlers/), how to [send messages](https://docs.particular.net/nservicebus/messaging/send-a-message) and [publish events](https://docs.particular.net/nservicebus/messaging/publish-subscribe/). Before you get too far you'll want a good [logging infrastructure](https://docs.particular.net/nservicebus/logging/). You'll need to create a [message serializer](https://docs.particular.net/nservicebus/serialization/) and infrastructure for [message routing](https://docs.particular.net/nservicebus/messaging/routing). You'll need to include a bunch of infrastructure-related metadata with the content of each business message. You'll want to build a message dequeuing strategy that performs well and uses broker connections efficiently, keeping concurrency needs in mind.

Next you'll need to figure out how to [retry messages automatically when the handling logic fails](https://docs.particular.net/nservicebus/recoverability/), but not *too many* times. You have to have a strategy for dealing with poison messages, so you'll need to move them aside so your handling logic doesn't get jammed preventing valid messages from being processed. You'll need a way to [show those messages that have failed and figure out why](https://docs.particular.net/servicepulse/), so you can fix the problem. You'll want some sort of [alerting options](https://docs.particular.net/servicecontrol/contracts) so you know when that happens. It would be nice if that poison message display also showed you where that message came from and what the exception was so you don't need to go digging through log files. After that you'll need to be able to [reroute the poison messages back into the queue to try again](https://docs.particular.net/tutorials/message-replay/). In the event of a bad deployment you might have a lot of failed messages, so it would be really nice if you didn't have to retry the messages one at a time.

## Transactions

Since you're using RabbitMQ, there are no transactions on the message broker, so ghost messages and duplicate entities are very real problems. You'll need to code all message handling logic with idempotency in mind or your RabbitMQ messages and database entities will begin to get inconsistent. Alternatively you could [design infrastructure to mimic distributed transactions](https://docs.particular.net/nservicebus/outbox/) by storing outgoing messaging operations in your business database and then executing the message dispatch operations separately. That results in duplicate messages (by design) so you'll need to deduplicate messages as they come in, which means you need well a well-defined [strategy for consistent message IDs](https://docs.particular.net/transports/rabbitmq/message-id-strategy) across your system. Be careful, as anything dealing with transactions and concurrency can be extremely tricky.

## Workflow

You'll probably want to do some [workflow type stuff](https://docs.particular.net/nservicebus/sagas/), where an incoming message starts a process that's essentially a message-driven state machine. Then you can do things like trigger an action once 2 required messages have been received. You'll need to design a storage system for that data. You'll probably also need a way to have delayed messages, so you can do things like the [buyer's remorse pattern](/2015/06/how-to-build-gmails-undo-send-feature/). RabbitMQ has no way to have an arbitrary delay on a message, so you'll have to [come up with a way to implement that](https://docs.particular.net/transports/rabbitmq/delayed-delivery).

You'll probably want some [metrics](https://docs.particular.net/nservicebus/operations/metrics) and [performance counters](https://docs.particular.net/nservicebus/operations/performance-counters) on this system to know how it's performing. You'll want some way to be able to [have tests on your message handling logic](https://docs.particular.net/nservicebus/testing/), so if you need to swap out some dependencies to make that work you might want to [integrate a dependency injection framework](https://docs.particular.net/nservicebus/dependency-injection/).

## Documentation

Because these systems are decentralized by nature it can get pretty difficult to accurately picture what your system looks like. If you [send a copy of every message to a central location](https://docs.particular.net/nservicebus/operations/auditing), you can [write some code](https://docs.particular.net/servicecontrol/) to stitch together all the message conversations, and then you can use that data to build message flow diagrams, sequence diagrams, etc. This kind of living documentation based on live data can be critical for explaining things to managers or figuring out why a process isn't working as expected.

Speaking of documentation, make sure you [**write a whole lot of it**](https://docs.particular.net/nservicebus/) for your message queue wrapper, otherwise it will be pretty difficult for other developers to help you maintain it. Of if someone else on your team is writing it, you'll be totally screwed when they get a different job and leave the company. You're also going to want a ton of unit tests on the RabbitMQ wrapper you've built. Infrastructure code like this should be rock-solid. You don't want losing a message to result in lost sales or anything like that.

So if you keep those few things in mind, you can totally use pure RabbitMQ without NServiceBus.

Hopefully, when you're done, your boss won't decide that you need to switch from [RabbitMQ](https://docs.particular.net/transports/rabbitmq/) to [Azure Service Bus](https://docs.particular.net/transports/azure-service-bus/) or [Amazon SQS](https://docs.particular.net/transports/sqs/).
