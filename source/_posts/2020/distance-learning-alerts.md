---
layout: post
date: 2020-12-03
title: Distance learning alerts with Google Calendar, Alexa, and Home Assistant
permalink: distance-learning-alerts-with-google-calendar-alexa-home-assistant
cover: /images/2020/colored-pencils.jpg
cover-from: https://pixabay.com/photos/colored-pencils-paint-heart-school-4031668/
comments: true
categories:
- Home Automation
tags:
- Home Assistant
---

My kids have been distance learning since March. When Fall came, we picked the Distance Choice option in our local school district. We wanted to support teachers in any way we could, we both have jobs that enable us to work from home, and we figured if cases continued to get worse then all students would be distance learning eventually and then our kids wouldn't have to make that transition mid-year.

For what it's worth, we were right. After Thanksgiving, everyone in our district is distance learning too.

My oldest is in 3rd grade, my youngest is in kindergarten. The district is pretty on top of things. Both kids have school-issued iPads, have sync lessons over [Zoom](https://zoom.us/) primarily on Mondays and Wednesdays, and get and submit assignments through [SeeSaw](https://web.seesaw.me/) on async days.

Two of the biggest problems at the start were schedule and Zoom links. Both kids have different schedules of when they need to be on Zoom, and needed an easy way to know which Zoom link they needed to join. I also didn't want to be typing Zoom meeting IDs into an iPad keyboard that I was reading off my computer or phone. I needed a way to be able to manage schedule and links from my computer, make them available to each kid, and then make sure their butt was in the seat at the appropriate time.

I have now brought all this together by combining Google Calendar and Alexa with the power of Home Assistant.

<!-- more -->

## Google Calendar

The first thing I did, even before I had Home Assistant, was to set up a Google Calendar for each kid.

![Kid schedule #1](/images/2020/distance-learning-schedule.png)

I set up a new Google Calendar for each kid on my personal Google account, and that's where I manage their schedule. The appropriate class Zoom URL goes in the Location. In some cases such as "Specialists" there are different links for Music, Tech, P.E., etc. which are in a Google Doc provided by the school. In those cases I just use the link to the Google Doc. Luckily, my daughter in 3rd grade is old enough to read and figure out some of those things without my help. With my son in Kindergarten I have to be a little more explicit.

Each kid has a Google sign-in through the school, so I manage the calendar and then I share it with them.

There was a trick to that, as at first the calendar didn't want to show up on their device. Google has a semi-secret link for [Sync Settings](https://calendar.google.com/calendar/u/0/syncselect) which I had to visit on each of their iPads before the calendar would sync to the iOS Calendar app.

With the calendar, whenever I get communication from the school that affects the schedule, I can make changes to the kid's Google calendar and the changes are automatically synced to them. So as long as they know to be on their tablet, they can figure out where to go.

The challenge is making sure they're in front of the tablet.

## Alexa

Each kid has an Alexa device near them. One is a 3rd-generation Echo Dot, the other is a Sonos One with Alexa enabled.

The natural thing to try was Alexa reminders. If the teacher says "Be back on Zoom after lunch at 1:00" then my kid would just say "Alexa, remind me to be back on Zoom at 1:00."

That worked for my eldest. For the kindergartener, it was a shit-show. He doesn't understand time yet. I would hear him outside my office door in the afternoon saying "Alexa, remind me to be back on Zoom at 9:50." Except it was already _after noon_ so instead of being reminded to be back on Zoom with his teacher at 1:50pm, my wife and I would get a reminder while watching TV long after the children had been put to bed.

So I tried scheduling reminders, but make no mistake, **this was a giant pain in the butt**. The only one that was really valuable was "Sign on for morning meeting" because it happened every weekday. The rest were impossible to keep synced with the calendar. Did I mention that there's still the concept of a "Day 1" through "Day 5" in the school schedule that relates to when the kids have class with different specialists? You can't set this up with Alexa when every recurring reminder takes about 150 taps in the Alexa app.

_Enter Home Assistant_.

## Home Assistant

The reason I decided to get Raspberry Pi running [Home Assistant](https://www.home-assistant.io/) wasn't for this problem. I was (actually still am) running SmartThings, but I've started to get cranky with the lack of flexibility that SmartThings allows. That's really a topic for another post.

After doing the [basic HomeAssistant setup](https://www.home-assistant.io/getting-started/), this is what I had to set up.

First, I installed the File Editor from the Home Assistant Add-On Store. This is useful for editing Home Assisstant's `configuration.yaml` file.

1. In the main menu, go to **Supervisor** > **Add-on Store**.
2. Under **Official add-ons** find and click on **File editor** and click **INSTALL**. When install is done, it goes to teh details page for the add-on.
3. Click **START**.
4. Now you have **File editor** in the main menu.

Next, I set up the [Google Calendar Event](https://www.home-assistant.io/integrations/calendar.google/) which is bundled with Home Assistant, but just has to have configuration added. As part of that process, a `google_calendars.yaml` file was created, which includes details on all of my calendars, including one for each kid. The result is that I now have a binary sensor (something that is either on or off) for each calendar.

Next, I needed to be able to have Home Assistant command a specific Alexa device to say a specific phrase on command. This…isn't _really_ supported, but it **is** possible.

## HACS & Alexa

For all the crazy things that aren't direclty supported by Home Assistant, there's HACS, which is short for [Home Assistant Community Store](https://hacs.xyz/). To [install HACS](https://hacs.xyz/docs/installation/prerequisites) you need a GitHub account (check), and access to the Home Assistant filesystem. For the latter, I added the [Samba share](https://github.com/home-assistant/addons/tree/master/samba) add-on, the same way I added the File editor. That allowed me to open the file system from my computer, and would be another way to edit the `configuration.yaml` file as well.

After installing HACS, a HACS menu item appears in the Home Assistant main menu. From **HACS** > **Integrations**, I installed the [Alexa Media Player](https://github.com/custom-components/alexa_media_player) component according to the [installation instructions](https://github.com/custom-components/alexa_media_player/wiki/Configuration). This is not official so Amazon could cut off access at any time…hopefully not until this distance learning fiasco is long over.

I believe Alexa also needs a TTS (text-to-speech) service registered in order to translate your words to speech. At any rate, I have this in my `configuration.yaml` and I'm unwilling to remove it to see if it's really required or not:

```
# Text to speech
tts:
  - platform: google_translate
```

Now, to test Alexa's ability to say stuff:

1. Go to **Developer Tools** > **Services**.
2. In the **Service** dropdown, select `notify.alexa_media_DEVICE_NAME`. One of these is generated for each of your Alexa devices. So for instance, the one in my office is `notify.alexa_media_office`. The auto-complete is key here.
3. In the **Service Data** editor, enter this:
    ```
    data:
      type: tts
    message: Hi there, I can make Alexa do my bidding.
    ```
4. Click **Call Service**.

No words can describe how giddy I was when this worked.

## Automation

Now to bring it all together. Go to **Configuration** > **Automations** and create a new automation using the **+** in the lower-right. Then press the **SKIP** button as this is not a simple "turn off the lights" style automation.

These are the settings for my daughter Ellie's notifications. If I don't mention a field, leave it blank.

1. **Triggers**:
    * Trigger type: State
    * Entity: `calendar.ellie_school`
    * To: `on`
2. **Conditions**: None
3. **Actions**:
    * Action type: Call service
    * Service: `notify.alexa_media_david_s_2nd_sonos_one_second_edition`
      * This is not the nicest name, but this is the device in the dining room where my daughter is set up.
    * Service data: As shown below

```
data:
  type: tts
message: >-
  {{ state_attr('calendar.ellie_school', 'description') if
  state_attr('calendar.ellie_school', 'description') != '' else
  state_attr('calendar.ellie_school', 'message') }}
```

I have another similar automation set up for my son, where the name of the calendar (in both the trigger and the script) and the device name in the Service are customized to him.

The Google Calendar integration exposes the calendar as an entity, similar to a sensor, and the properties of the current calendar entry as state attributes, similar to the temperature and humidity that the sensor would return. The message for Alexa to play is constructed from the Description field of the calendar event, or if that is missing, from the event title. That way I can have a title like "Morning Meeting" but have Alexa say something more useful like "Ellie, time to sign on to morning meeting."

## Caveats

The Google Calendar integration has some limitations that limit how I can use it.

The integration gets its data from Google by polling every 5-15 minutes, which is no surprise. My initial assumption was that on each poll, Home Assistant would download the next hour or so of events, and then dutifully trigger the sensor precisely at the beginning of every event in that range, until the data is updated by the next poll.

_That's just not at all how it works._

Remember that the calendar is surfaced like a sensor, and really more of a binary sensor, which is triggered when it turns on. That means if you have back to back events (like Reading directly after Number Corner) the sensor will transition from "on" to "on" and, as a result, the automation won't be triggered.

The sensor, along with its collection of state attributes, is also the only place any data is stored that comes from Google. So it can only store data for one event at a time.

In practice, this means that I need to make sure events that are adjoining in real life are separated on the calendar by about 15 minutes, so that between events a poll of the server can get the next event's data and reset the sensor to off until the next event starts.

I've also noticed that the Alexa notifications don't happen right at the appointed time and can take up to about 45 seconds to happen. I ensured that all devices involved use a network time server and that clock drift is not an issue.

I'm not sure about the root cause. It could be some sort of refresh interval within Home Assistant. It could be that it takes some time for the text of the message to be translated to speech before it's played. It could be many things.

Because I don't want my kids to be consistently late, I set the calendar appointments to start a minute or two before the true start time.

The [sensor attributes](https://www.home-assistant.io/integrations/calendar.google/#sensor-attributes) include an `offset_reached` that is supposed to be used to trigger before the true event start time. Unfortunately, it requires including `!!-2` in the event title in order to have the offset reached 2 minutes before start time, and I thought that would confuse my kids. I wish there was a calendar-level setting so that all events on that calendar used a specific offset.

I get the feeling that this integration was meant for situations like not running certain automations when you're on vacation, where these minute timing details wouldn't matter.

## Summary

With Home Assistant, Google Calendar, and Alexa, I'm able to manage both my kids' distance learning schedules, so that they have easy access to the Zoom links they need for school, and to be notified by Alexa when they need to use them.

This isn't how I thought I'd be using Home Assistant when I ordered the Raspberry Pi. I haven't even set up Z-Wave or ZigBee integration yet. But a few nights of wondering what I could get away with resulted in something that makes managing a nearly impossible situation a lot easier.

In the future I plan to use the Google Calendar integration more, for stuff like turning on the lights in my office in the morning automatically, but only on weekdays when I'm not on vacation.
