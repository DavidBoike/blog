---
layout: post
date: 2013-10-22
title: Angular&#47;Ember&#47;Knockout Data-Binding Comparison
permalink: angular-ember-knockout-data-binding-comparison
excerpt: "Recently a colleague referred me to a video from Marius Gunderson&rsquo;s  session at JSConf EU 2013 entitled A comparison of the two-way binding in AngularJS,  EmberJS and KnockoutJS. It&rsquo;s an excellent watch, comparing and contrasting  the two-way databinding capabilities of each product without descending into a flame  war about which is better, and it only weighs in at 20 minutes long. Here&rsquo;s  the video itself.\r\n\r\n"
categories:
- Development
tags:
- Angular
- Ember
- Knockout
- data-binding
- SPA
comments: true
---
Recently a colleague referred me to a video from Marius Gunderson’s session at JSConf EU 2013 entitled A comparison of the two-way binding in AngularJS, EmberJS and KnockoutJS. It’s an excellent watch, comparing and contrasting the two-way databinding capabilities of each product without descending into a flame war about which is better, and it only weighs in at 20 minutes long. Here’s the video itself.

 Of course everyone is trying to figure out what the best framework for creating single page applications right now. [Knockout](http://knockoutjs.com/) doesn’t qualify as a full framework but it can be paired with [Durandal](http://durandaljs.com/) to fill in the missing bits. RavenDB 3.0 is using Durandal with Knockout to power their [new HTML5 RavenDB Studio](http://www.youtube.com/watch?v=FNDKuiftKcc) to replace the current Silverlight version. [Ember](http://emberjs.com/) is perhaps most notable for being used by [Jeff Atwood](http://www.codinghorror.com/blog/) and the rest of the [Discourse](http://www.discourse.org/) team to remake forum software for the next decade. And of course [Angular](http://angularjs.org/), created by Google, seems to be easily [winning most popularity contests, as evidenced by Google Trends](http://www.google.com/trends/explore?hl=en-US#cat=0-5-31&q=Durandal%2C%20Angular%2C%20Ember%2C%20Meteor%2C%20Backbone&date=today%2012-m&cmpt=q).

(Of course, it’s not such a hot time to be a Backbone fan, as Backbone seems to be in decline these days.)

Before watching this video, I had some misgivings about Angular. [Robin Ward](http://eviltrout.com/) of the Discourse team has a great blog post touting Ember’s advantages over Angular, and some of these really resonate with me. Specific to this video is the fact that Angular does dirty-checking, sometimes re-evaluating an expression up to 10 times to make sure its value doesn’t drift. This seems ridiculously inefficient, and an invitation to poorly performing web applications.

Other frameworks handle this in different ways. Both Knockout and Ember have the ability to create computed properties, but this comes at the cost of complicated (and differing) APIs, where Angular’s dirty-checking allows use of a plain old JavaScript object.

What this made me realize is that, at least as far as data-binding is concerned, Angular may be the most forward-thinking of all the frameworks. At some point in the future, hopefully browsers will start to support [object.observe](http://wiki.ecmascript.org/doku.php?id=harmony:observe) (currently [only supported by Chrome Canary](http://updates.html5rocks.com/2012/11/Respond-to-change-with-Object-observe) right now as far as I’m aware), and when this happens, Angular will be positioned to use this natively and skip the dirty checking, while other libraries and frameworks, while they may be slightly more performant in those scenarios now, will be forever saddled with the complicated APIs necessary to get around this temporary shortcoming of JavaScript. Angular could polyfill browsers without object.observe support by polyfilling the behavior with the current dirty-checking methods. It would be like a free speed upgrade when those browsers become available.

In any case, two-way data-binding is only one aspect of the current SPA battles. A new framework could always be unveiled tomorrow that trumps all of them. Only time will tell.

What do you think? I’d love to hear your thoughts in the comments below.
