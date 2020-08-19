---
layout: post
date: 2020-04-15
title: Overriding the NServiceBus ConversationId
permalink: overriding-the-nservicebus-conversationid
cover: /images/2020/megaphones.jpg
comments: true
categories:
- Development
tags:
- NServiceBus
- Sagas
- source code
---

> _**UPDATE:** Starting in NServiceBus version 7.4 you can [create a new ConversationId](https://docs.particular.net/nservicebus/messaging/headers#messaging-interaction-headers-nservicebus-conversationid-starting-a-new-conversation) using `sendOptions.StartNewConversation()`. No more need to create a custom pipeline behavior as I explain here._

The purpose of the `ConversationId` header included with every NServiceBus message is to relate a whole bunch of messages together as all having started from the same action. It's generally a very bad idea to mess with the `ConversationId` in a message handler, so if you try, you'll get this exception:

> System.Exception: Cannot set the NServiceBus.ConversationId header to '9203ecb1-d2ed-46eb-ae99-fbeb7a5db387' as it cannot override the incoming header value ('a1c91a87-2db9-493f-a638-ab9d016a1305').

But there are some times when it _might_ be a good idea to override this id, if you know what you're doing. This article shows you how to do that.

<!-- more -->

## What `ConversationId` is for

When you click in a web application (for example) a message gets sent. This is the very first message in the "conversation" so a new `ConversationId` is generated. From that point on, every message that is sent as a result of that original message (from message handlers sending or publishing still more messages) copies the same `ConversationId` from the incoming message.

When these messages get successfuly processed, we can send a copy of them to an auditing store, like [ServiceControl](https://docs.particular.net/servicecontrol/).

Then [ServiceInsight](https://docs.particular.net/serviceinsight/) can query our auditing store for messages having the same `ConversationId`, and with that information build a flow diagram like this:

![Flow diagram](/images/2020/flow-diagram.png)

Or, a sequence diagram like this:

![Sequence diagram](/images/2020/sequence-diagram.png)

## The problem

The problem is when you use a never-ending saga, something like the `CustomerHasBecomePreferred` saga I wrote about in [Death to the batch job](https://particular.net/blog/death-to-the-batch-job), or the [sample scheduler saga](/2020/04/creating-a-scheduler-with-nservicebus/) I wrote in my last post. There's never an event to say "This is the start of a new conversation, please come up with a new ID."

If you try to look at a saga like this using ServiceInsight, the diagrams would get larger and more complex the longer the saga lived, and it wouldn't take long for the diagrams to become completely unusable.

## Solution

Let's take another look at the exception if we try to change the `ConversationId` within a message handler. This time I'll include a couple lines from the stack trace.

```
System.Exception: Cannot set the NServiceBus.ConversationId header to '9203ecb1-d2ed-46eb-ae99-fbeb7a5db387' as it cannot override the incoming header value ('a1c91a87-2db9-493f-a638-ab9d016a1305').
   at NServiceBus.AttachCausationHeadersBehavior.SetConversationIdHeader(IOutgoingLogicalMessageContext context, IncomingMessage incomingMessage)
   at NServiceBus.AttachCausationHeadersBehavior.Invoke(IOutgoingLogicalMessageContext context, Func`2 next)
   ...
```

I include the first couple lines of the stack trace because that's a clue for how to get around this quandary. Specifically, the `AttachCausationHeadersBehavior` where the method takes an `IOutgoingLogicalMessageContext`.

This is a [pipeline behavior](https://docs.particular.net/nservicebus/pipeline/manipulate-with-behaviors), one of many built into NServiceBus that do things to messages as they're either processed (incoming behaviors) or sent out (outgoing behaviors).

In this case, `IOutgoingLogicalMessageContext` tells us that we're operating on the part of the _outgoing_ message pipeline where we have a `logical message`—in other words, we're still dealing with a class and haven't serialized the message to bytes to send to the message transport yet.

We can operate later in the pipeline by creating our own behavior operating on the `IOutgoingPhysicalMessageContext`.

```cs
public class ModifyConversationIdBehavior : Behavior<IOutgoingPhysicalMessageContext>
{
    public const string OverrideHeader = "Temp.OverrideConversationId";

    public override Task Invoke(IOutgoingPhysicalMessageContext context, Func<Task> next)
    {
        // If a temporary override header has been set, move THAT value into the real header
        if(context.Headers.TryGetValue(OverrideHeader, out string overridingConversationId))
        {
            context.Headers[Headers.ConversationId] = overridingConversationId;
            context.Headers.Remove(OverrideHeader);
        }

        // Execute the rest of the pipeline
        return next();
    }
}
```

We also have to register this new pipeline behavior when we configure the endpoint containing the scheduler saga:

```cs
endpointConfiguration.Pipeline.Register(new ModifyConversationIdBehavior(), "Modifies the ConversationId of an outgoing message if necessary.");
```

Now, from wherever point you want to cut the conversation into two (in my scheduler saga, it's the point where the scheduler fires off a new execution of the task) you can do this:

```cs
var command = new WhateverCommand();

var sendOptions = new SendOptions();
sendOptions.SetHeader(ModifyConversationIdBehavior.OverrideHeader, Guid.NewGuid().ToString());
await context.Send(command, sendOptions);
```

When intercepted by the behavior the value stored in the `OverrideHeader` will override the value copied from the previous message in the chain, effectively starting a brand new conversation.

## Summary

Overriding `ConversationId` isn't something to be done lightly, as you can break your auditing and message visualizations. That's why the NServiceBus API tries to prevent you from doing it. But with a framework as extensible as NServiceBus, there's almost always a way to break the rules, and [pipeline behaviors](https://docs.particular.net/nservicebus/pipeline/manipulate-with-behaviors) are a common outlet for well-meaning rule-breakers to do just about anything you can dream up.

For more on useful behaviors, you might want to check out my post [Infrastructure soup](https://particular.net/blog/infrastructure-soup) on the Particular Software blog.
