---
layout: post
date: 2020-04-15
title: Creating a scheduler with NServiceBus
permalink: creating-a-scheduler-with-nservicebus
cover: /images/2020/wristwatch.jpg
comments: true
categories:
- Development
tags:
- NServiceBus
- Sagas
- source code
---

Sometimes a system needs a kind of rudimentary scheduler to tell it when it's time to do things. Run a weekly report. Poll a legacy system for changes every night. Run some script every 4 hours. The examples are plentiful but usually quite boring.

In a message-based system with NServiceBus, starting these tasks is usually as simple as sending a command, but something still has to send that command on the right schedule. We could use a Windows Scheduled Task, but that feels gross for a couple of reasons. First, we have to create a dedicated app just to spin up a send-only endpoint, send one command, and then die. Second, it feels wrong somehow that using scheduled tasks would take an important part of the system (the schedule) and place it entirely outside the system, complicating the deployment, especially if we (the developers) don't have direct access to the production infrastructure, either because of our sysadmins or because there is no infrastructure because we're using Platform-as-a-Service in the cloud.

So we're dealing with NServiceBus and time, and NServiceBus is supposed to be able to model time through the use of sagas. So couldn't we implement a simple scheduler using a saga?

Well sure of course we could. But should we? It's a classic *it depends* scenario. So let's delve a little further. I'll explain how you *could* do it, and then we'll be in a better place to talk about whether that's even a good idea in the first place.

<!-- more -->

## The saga

Remember that a saga is basically a message-driven state machine (see the [saga basics tutorial](https://docs.particular.net/tutorials/nservicebus-sagas/1-getting-started/)) where the state is stored (usually in a database of some kind) between messages. Some of those messages can have a delay (see the [timeouts tutorial](https://docs.particular.net/tutorials/nservicebus-sagas/2-timeouts/)) to wake it up at some point in the future.

Ideally, a scheduler saga would be able to handle multiple schedules, otherwise, a saga is actually quite a bit of code for something so simple, especially if you have to create multiple of them. Sagas are hard to use as a singleton process anyway—they want to use a `CorrelationId` to tell between different *instances* of the saga that all have independent data.

We can take advantage of that - each saga instance will be for a different schedule, and the `CorrelationId` will be the type of message we want to send when the schedule comes due.

First, let's look at the message we'll send to start the scheduler saga:

```cs
using System;
using System.Collections.Generic;
using System.Text;
using NServiceBus;

namespace Messages
{
    public class StartSchedule : ICommand
    {
        public string CommandTypeFullName { get; set; }
        public TimeSpan Interval { get; set; }
        public WeeklySchedule Weekly { get; set; }

        public StartSchedule() { }

        public StartSchedule(Type type, TimeSpan interval)
            : this()
        {
            CommandTypeFullName = type.FullName;
            Interval = interval;
        }

        public StartSchedule(Type type, WeeklySchedule weekly)
        {
            CommandTypeFullName = type.FullName;
            Weekly = weekly;
        }
    }

    public class WeeklySchedule
    {
        public DayOfWeek[] DaysOfWeek { get; set; }
        public TimeSpan TimeOfDay { get; set; }
    }
}
```

This allows us two variations on schedule. Either we can do a weekly schedule, on multiple days if necessary but all at the same time of day, by sending a message like this:

```cs
await endpoint.Send(new StartSchedule(typeof(DoFirstThingWeekly), new WeeklySchedule
{
    DaysOfWeek = new [] { DayOfWeek.Friday },
    TimeOfDay = new TimeSpan(12, 0 ,0)
}));
```

Or, we can do a regular time span, like every 8 hours for instance, like this:

```cs
await endpoint.Send(new StartSchedule(typeof(DoSecondThingEvery8Hours), TimeSpan.FromHours(8)));
```

These calls should be made from your application's startup. This way, the saga will be "reminded" of the schedule every single time your app starts up, and also covers the use cases of bootstrapping the first run or changing the schedule later on.

Now let's get to the actual saga, which I'll attempt to mark up with comments:

```cs
using System;
using System.Linq;
using System.Threading.Tasks;
using NServiceBus;
using Messages;

public class Scheduler : Saga<Scheduler.ScheduleData>,
    IAmStartedByMessages<StartSchedule>,
    IHandleTimeouts<Scheduler.NextTimeTimeout>
{
    public class ScheduleData : ContainSagaData
    {
        public string CommandTypeFullName { get; set; }
        public TimeSpan Interval { get; set; }
        public WeeklySchedule Weekly { get; set; }
        public DateTime NextRun { get; set; }
    }

    protected override void ConfigureHowToFindSaga(SagaPropertyMapper<ScheduleData> mapper)
    {
        // The mapper is responsible for finding the saga data based on a message.
        // So in SQL this would generate something like:
        //     select from ScheduleData 
        //     where CommandTypeFullName = @MessageValueOfCommandTypeFullName
        mapper.ConfigureMapping<StartSchedule>(m => m.CommandTypeFullName)
           .ToSaga(s => s.CommandTypeFullName);
    }

    public Task Handle(StartSchedule message, IMessageHandlerContext context)
    {
        // Either we're starting the saga for the first time, or "reprogramming" it 
        // with new schedule data, so we store the new values and then go to Run() 
        // to do the dirty work
        Data.Interval = message.Interval;
        Data.Weekly = message.Weekly;
        return Run(context);
    }

    public Task Timeout(NextTimeTimeout state, IMessageHandlerContext context)
    {
        // When a timeout message comes due, we just want to see whether 
        // it's time to act
        return Run(context);
    }

    async Task Run(IMessageHandlerContext context)
    {
        var now = DateTime.UtcNow;

        // May be because the app just started up or we're "reprogramming" the saga
        // We don't necessarily want to spring into action unless it's really time.
        if (Data.NextRun > now)
        {
            return;
        }

        // Depending on whether we're doing interval/weekly scheduling, we want to 
        // figure out when the next time to run is.
        if (Data.Interval > TimeSpan.Zero)
        {
            Data.NextRun = now + Data.Interval;
        }
        else if (Data.Weekly != null)
        {
            // Cycle through the next 7 days until we find the next scheduled date
            var start = now.Date.AddDays(1);
            for (var day = start; day < start.AddDays(7); day = day.AddDays(1))
            {
                if (Data.Weekly.DaysOfWeek.Contains(day.DayOfWeek))
                {
                    Data.NextRun = day + Data.Weekly.TimeOfDay;
                }
            }
        }

        // Get a type from the command name. Must be in same assembly as StartSchedule
        var commandType = typeof(StartSchedule).Assembly
            .GetType(Data.CommandTypeFullName);
        
        // Create & send instance of the command. Must be parameterless constructor
        var command = Activator.CreateInstance(commandType) as ICommand;
        await context.Send(command);

        // Request the timeout for the next activation
        await RequestTimeout<NextTimeTimeout>(context, Data.NextRun);
    }

    public class NextTimeTimeout { }
}
```

Does this work? Sure! Well, mostly. It's got some issues, but depending on the project, these may be anything from easy-to-ignore minor details all the way up to showstoppers. Let's look at each of these "it depends" scenarios.

## Clock drift

Arguably the biggest problem with this whole saga implementation are these 4 lines, which at first glance look logically correct:

```cs
if (Data.NextRun > now)
{
    return;
}
```

Because we want to be able to "reprogram" the saga at any time, we want to be able to ignore some messages, like if a `StartSchedule` message comes in that's only the result of your app restarting.

Logically, the timeout message should occur after `now` and should skip this check—after all that's the point of a timeout.

But what if the timeout is handled by a message transport like Azure Service Bus that has native scheduled messages, and what if the clock on the processing server has drifted such that it is a few seconds behind official "Azure Time"?

The result will be that the message scheduled for 12:00:00 UTC may arrive, as far as the processing server is concerned, at 11:59:57 UTC. At that point, `Data.NextRun` of noon is 3 seconds in the "future", so the message will be ignored.

Not only will the scheduled task _not_ fire, but because the next schedule is set at the same time, the scheduler is essentially in limbo until the next time your app starts up to send a `StartSchedule` that will be after the `Data.NextRun` time.

One way to try to fix this is to have a bit of tolerance for clock drift in the code, like this:

```cs
if (Data.NextRun > now.AddSeconds(-30))
{
    return;
}
```

This way, the clock can drift up to 30 seconds and still get the behavior we want. However, this saga is now pretty useless for doing anything with sub-minute times with much accuracy. In the cases where I've done this, I only care that the task happens once a day, or maybe every 8 hours, and I'm not too fussed if it happens 30 seconds off its scheduled time. I just want it done.

## Reprogramming is limited

In this saga, you can reprogram the timer, but only by deploying new code. Because we're storing the next run time and not taking any action before that time, you basically can't reprogram it to anything _faster_ than what it was doing before. If it's not going to run until 8 hours from now, and you reprogram it to be an hourly timer, then sorry, it's not going to run for 8 hours, but *then* it will run for every hour after that.

This becomes more of a problem if you accidentally have a deployment set a next run time on the order of days/months, and then want it to be hourly for some reason.

It would be possible to change the code to always recalculate the next run time on receipt of `StartSchedule`, but then the code can get much more complex, and you run the risk of upsetting the schedule if for some reason you encounter more frequent app restarts.

In my situation, my schedules are completely arbitrary and I have no intention of changing them…ever. So no need to worry.

## Auditing

If you're auditing messages to ServiceControl, and want to be able to view diagrams in ServiceInsight, then this scheduler has a bit of a problem because all the messages coming from this saga are going to be viewed as part of the conversation because they all share the same `ConversationId` header. So there wouldn't be any way to look at the message flow from just the most recent execution, or the one that happened 3 days ago. The diagrams would get bigger and more complex, and it wouldn't take very long for the diagrams to become unusable.

This would be really frustrating if each schedule kicks off some process, such as a file import, with many substeps that you'd want to be able to visually debug later.

Well, there are ways around such things, like changing the `ConversationId` so that the conversations are separate. It's not possible to directly set the `ConversationId` within a handler though.

This post was getting pretty long, and changing the `ConversationId` has uses outside of this scheduler saga, so I wrote a separate post on [overriding the NServiceBus ConversationId](/2020/04/overriding-the-nservicebus-conversationid/). If you create the behavior outlined in that article, then you can change the saga code a bit.

With the behavior outlined in that article in place, you can change this code in the saga:

```cs
// Create an instance of the command and send it. Must be parameterless constructor
var command = Activator.CreateInstance(commandType) as ICommand;
await context.Send(command);
```

To this:

```cs
// Create an instance of the command and send it. Must be parameterless constructor
var command = Activator.CreateInstance(commandType) as ICommand;

var sendOptions = new SendOptions();
sendOptions.SetHeader(ModifyConversationIdBehavior.OverrideHeader, Guid.NewGuid().ToString());
await context.Send(command, sendOptions);
```

Now every command sent out by the scheduler will be a fresh conversation you can look at individually in ServiceInsight.

Of course, if you're not auditing messages at all, then you don't need to do anything like that.

## Date and time is just hard

This is a super-simple scheduler, doing only weekly and interval scheduling. For me, that's all I need. If you wanted to do any of the fancy things your calendar app can do, like:

* Repeat every N days
* Repeat every N weeks
* Repeat every N months
* Repeat on the Nth Tuesday of the month
* Repeat every N years
* Ending after N occurrences
* Ending on X date
* Anything to do with time zones
* Anything where you care about Daylight Saving
* Anything where you care about leap days
* Anything involving [Easter](https://www.timeanddate.com/calendar/determining-easter-date.html)

…well then you're out of luck. Date and time are hard, and if you don't believe me, go read some blog posts by [Matt Johnson-Pint](https://codeofmatt.com/).  I don't recommend trying to extend the code to handle any of these other scenarios. It's not worth it. Keep reading and pick a different option.

## Scheduling alternatives

I've presented a simple scheduler saga, and a bunch of problems it might cause you, all of which you can address to some varying degree. But is it worth it?

![Your scientists were so preoccupied with whether or not you could, you didn't stop to think if you should](/images/2020/could-should.jpg)

If you're running a small project with very simple scheduling needs, and none of the sections above gives you pause, then you'll probably be fine. Otherwise, you might want to think about one of these alternatives, any of which you can use to send an NServiceBus message.

* [Quartz.NET](https://www.quartz-scheduler.net/) is a full-featured scheduler library for .NET. It can be complex, but it can do anything you need it to.
* [Hangfire](https://www.hangfire.io/) is a way to perform background processing on .NET without a Windows service or separate process. It can handle recurring jobs using a CRON schedule and persists the jobs in a database, so you don't have to worry about app restarts mucking up your schedule.
* [Azure Functions](https://azure.microsoft.com/en-us/services/functions/) has a [timer trigger](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=csharp) that runs a CRON schedule.

## Summary

A bad consultant will say "it depends" and leave it at that. A good one will say "it depends" but then tell you the things it depends on.

My aim in writing this article is not so much to share the code for the scheduler saga, but to highlight all the "it depends" around whether or not it's a good tool for your particular job.

I do use this exact scheduler saga in a project. It's a small project, more of a proof of concept, that runs as a single NServiceBus endpoint embedded in an Azure App Service run using Visual Studio Azure credits. I'm already using NServiceBus in this project, and so I'm looking for reliable scheduling (i.e. not `System.Timers.Timer`) with the lowest possible barrier to entry.

None of the caveats in this article apply to me, so I'm happy to use it. Though I must advmit, if I had to do it over, I would strongly consider using an Azure Functions timer trigger instead.

