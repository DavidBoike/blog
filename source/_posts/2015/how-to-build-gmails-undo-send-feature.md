---
layout: post
date: 2015-06-30
title: "How to build Gmail's \"Undo Send\" feature"
permalink: how-to-build-gmails-undo-send-feature
comments: true
categories:
- Development
tags:
- NServiceBus
- Google
---
The other day I read this article about how Gmail will [finally let you "Undo Send" emails you wish you didn't send](http://mashable.com/2015/06/23/undo-send-gmail/).

Really Google? *Really?* What took you so long? I mean, I know you've been very busy shuttering Google Reader and all that, but offering the ability to undo sending an email within 30 seconds is actually pretty easy to build.

At least, it is with [NServiceBus](http://particular.net/nservicebus), and specifically, using an NServiceBus [Saga](http://docs.particular.net/nservicebus/sagas/). I'll show you how.

"Undo Send" is really just a specific case of a much more general pattern I'll call the buyer's remorse pattern.

<!-- more -->

## Buyer's remorse pattern

[In real life](https://en.wikipedia.org/wiki/Buyer%27s_remorse), we might get buyer's remorse when we buy an expensive car and then realize just how long we're going to have to make expensive payments on it. In software, we're not talking about a purchase - we're really referring to any action that cannot be easily undone. Sending emails fall squarely within this category of problems, along with charging credit cards, which can cause *real* buyer's remorse.

Using the buyer's remorse pattern simply means that instead of immediately sending the email, the software will wait a certain amount of time first, in case the user thinks better about what they just did and wants to back out.

The time delay is the tricky part of implementing buyer's remorse, but with NServiceBus, it becomes easy.

## Step-by-step

I won't cover how to do buyer's remorse in your UI. I would assume your user would click the Send button, and then you'd display an alert bar saying "Your message has been sent. (Click to undo)". For the sake of this example, let's assume this is a single-page application, and both the "Send" button and "Click to undo" would fire a request to a REST API that could send NServiceBus commands to a back-end service.

### Message definitions

Here's what the commands would look like:

    public class SendEmail : ICommand
    {
        public Guid MessageId { get; set; }
        public EmailDetails MessageDetails { get; set; }
    }

    public class UndoSendEmail : ICommand
    {
        public Guid MessageId { get; set; }
    }
    
The `MessageId` is just a `Guid` that serves as a unique identifier for the message being sent. That way when we "send" the message, and then subsequently "undo send", we know we're talking about the same message.

I'll leave the `EmailDetails` class up to you. Actually, that's the *real* hard part about sending an email. Classes like [`System.Net.MailMessage`](https://msdn.microsoft.com/en-us/library/system.net.mail.mailmessage.aspx) and [`System.Net.MailAddress`](https://msdn.microsoft.com/en-us/library/system.net.mail.mailaddress.aspx) are chock full of get-only properties and other gross stuff that don't make them good candidates to include in messages, plus they probably contain way more information than you really need for your use case anyway. So just create your own containing only get/set properties for the details you need.

We're also going to need a class to represent the timeout message. This is far from complex:

    public class UndoSendTimeout { }

### Basic saga structure
    
We start with the scaffolding of an NServiceBus Saga that handles these messages. An NServiceBus Saga is really just a collection of message handling methods that store some shared state in a database between messages.

```
public class UndoSendPolicy : Saga<UndoSendPolicyData>,
    IAmStartedByMessages<SendEmail>,
    IAmStartedByMessages<UndoSendEmail>,
    IHandleTimeouts<UndoSendTimeout>
{
    protected override void ConfigureHowToFindSaga(SagaPropertyMapper<UndoSendPolicyData> mapper)
    {
        mapper.ConfigureMapping<SendEmail>(msg => msg.MessageId)
            .ToSaga(data => data.MessageId);
        mapper.ConfigureMapping<UndoSendEmail>(msg => msg.MessageId)
            .ToSaga(data => data.MessageId);
    }
    
    public void Handle(SendEmail message)
    {
        // TODO
    }

    public void Handle(UndoSendEmail message)
    {
        // TODO
    }
    
    public void Timeout(UndoSendTimeout state)
    {
        // TODO
    }
```

For the moment, let's ignore `UndoSendPolicyData`, the class that represents the state stored in the database between messages.

You may find it odd that both the `SendEmail` command and the `UndoSendEmail` command are both implemented as `IAmStartedByMessages<TMessage>` rather than the alternative `IHandleMessages<TMessage>`, when clearly if the `UndoSendEmail` occurs, it will happen later in time. It's important to remember that in an eventually consistent, asynchronous system, it's possible that `SendEmail` could be delayed for some reason and `UndoSendEmail` might actually arrive first!

Because of this possibility, it's best to use `IHandleMessages<TMessage>` *only for messages sent by the Saga itself!*

The last thing to look at is the `ConfigureHowToFindSaga` method, which teaches the persistence how to look for saga data for each incoming message. For both message types, this is saying "Find a property in the message called `MessageId`, and try to match that up to some saga data in the database with a matching `MessageId`." If none is found, and the message is an `IAmStartedByMessages<TMessage>` then the Saga will create new data for us.

Now let's get back to the `UndoSendPolicyData` class that will store our saga data for us while we're waiting for the timeout period.

```
public class UndoSendPolicyData : ContainSagaData
{
    public Guid MessageId { get; set; }
    public EmailDetails MessageDetails { get; set; }
    public bool UndoSend { get; set; }
}
```

We store the `MessageId`, so that our saga-finding mapper can match it up later. We also store the message details received from the `SendEmail` command. Lastly, an `UndoSend` indicator lets us know if an `UndoSendEmail` command has been received.

### Message handlers

Now let's start to implement our message handlers, starting with the handler for the `SendEmail` command:

    public void Handle(SendEmail message)
    {
        this.Data.MessageId = message.MessageId;
        this.Data.MessageDetails = message.MessageDetails;

        this.RequestTimeout<UndoSendTimeout>(TimeSpan.FromSeconds(30));
    }

When the Saga receives its very first message, the saga data (in `this.Data`) will be uninitialized, so it's very important to fill it with information from the incoming command. We don't actually want to send the email yet, so we request a timeout from the Saga infrastructure so that we can get a `UndoSendTimeout` reminder in 30 seconds.

Next, let's handle the `UndoSendEmail` command:

    public void Handle(UndoSendEmail message)
    {
        this.Data.MessageId = message.MessageId;
        this.Data.UndoSend = true;
    }

We don't actually *do* much of anything here either. We still initialize the `MessageId` property, because remember that it's possible for `UndoSendEmail` to arrive first, meaning the saga data could be uninitialized for this handler as well.

Lastly, we implement the handler for the `UndoSendTimeout` message:

    public void Timeout(UndoSendTimeout state)
    {
        if (this.Data.UndoSend == false)
        {
            SendEmail(this.Data.MessageDetails);
        }
        this.MarkAsComplete();
    }

If we haven't cancelled the send, then we call a method that will build the `MailMessage` from our message details and dispatch it to the SMTP server. Then, in either case, we call `MarkAsComplete()`, which will remove the saga data from the database. If the Saga did receive an `UndoSendEmail` command then the message just goes away, no harm, no foul.

So remember that the messages could arrive in any order. This means that one of the following will happen:

1. `SendEmail` arrives, and the user does not undo, so the email is sent 30 seconds later.
2. `SendEmail` arrives, and the `UndoSendEmail` command arrives a bit later, so when the timeout fires, the email is not sent.
3. `SendEmail` is delayed and `UndoSendEmail` arrives first. The saga data is created with `UndoSend == true`. When `SendEmail` arrives, it dutifully requests the timeout. 30 seconds later, the timeout is received, and because `UndoSend` is set, the email is not sent.
4. `SendEmail` arrives, and the user stares at their screen for 29 seconds, then finally sends `UndoSendEmail` too late. The timeout fires, sends the email, and removes the saga data. Finally, the `UndoSendEmail` arrives, and because it is also an `IAmStartedBy<T>` message, it recreates the saga data! Oops!

Scenario #4 isn't really what we had in mind, but it illustrates that we always need to consider what will happen if messages arrive out of their expected order. There are a lot of ways to handle this, including an additional timeout to delay cleaning up the saga for a much longer period (perhaps 24 hours), or a timestamp added to the `UndoSendEmail` command so that it could be effectively ignored if old enough. I'll leave implementing one of those as an exercise for the reader.

## Full code

Here is the full code for the `UndoSendPolicy` saga, for those who prefer to see everything at once:

```
public class UndoSendPolicy : Saga<UndoSendPolicyData>,
    IAmStartedByMessages<SendEmail>,
    IAmStartedByMessages<UndoSendEmail>,
    IHandleTimeouts<UndoSendTimeout>
{
    protected override void ConfigureHowToFindSaga(SagaPropertyMapper<UndoSendPolicyData> mapper)
    {
        mapper.ConfigureMapping<SendEmail>(msg => msg.MessageId)
            .ToSaga(data => data.MessageId);
        mapper.ConfigureMapping<UndoSendEmail>(msg => msg.MessageId)
            .ToSaga(data => data.MessageId);
    }

    public void Handle(SendEmail message)
    {
        this.Data.MessageId = message.MessageId;
        this.Data.MessageDetails = message.MessageDetails;

        this.RequestTimeout<UndoSendTimeout>(TimeSpan.FromSeconds(30));
    }

    public void Handle(UndoSendEmail message)
    {
        this.Data.MessageId = message.MessageId;
        this.Data.UndoSend = true;
    }

    public void Timeout(UndoSendTimeout state)
    {
        if (this.Data.UndoSend == false)
        {
            SendEmail(this.Data.MessageDetails);
        }
        this.MarkAsComplete();
    }

    private void SendEmail(EmailDetails email)
    {
        // Dispatch the message to the SMTP server
    }
}

public class UndoSendPolicyData : ContainSagaData
{
    public Guid MessageId { get; set; }
    public EmailDetails MessageDetails { get; set; }
    public bool UndoSend { get; set; }
}

public class SendEmail : ICommand
{
    public Guid MessageId { get; set; }
    public EmailDetails MessageDetails { get; set; }
}

public class UndoSendEmail : ICommand
{
    public Guid MessageId { get; set; }
}

public class EmailDetails
{
    // Up to you - create what you need for your use case
}

public class UndoSendTimeout { }
```

## Summary

Buyer's remorse is a pattern to deal with operations that otherwise cannot be undone by delaying them for a short time while waiting for cancellation. With it we can implement Google's Undo Send feature, but there are many more uses for it.

Credit card charges are technically reversible, although doing so is messy, as it requires a charge reversal that would appear on the customer's statement. It's a lot cleaner to prevent the credit card from having ever been charged by introducing the time delay with the buyer's remorse pattern.

In fact, with e-commerce use cases, the buyer's remorse pattern can get a little more interesting. It should always be possible to cancel an order. Just after the order, we can use the buyer's remorse pattern to prevent accidental orders. After the credit card is charged and before products are shipped, we should be able to cancel the order and refund the payment. Even after products are shipped, we should be able to cancel the order, and provide a refund (perhaps partial) provided that the items are returned.

All of these are great applications for sagas, which give you the ability to model business requirements together with the passage of time. Buyer's remorse is just a start.
