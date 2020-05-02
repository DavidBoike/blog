---
layout: post
date: 2010-06-07
title: The dangers of decimal.Round()
permalink: the-dangers-of-decimal-round
categories:
- Development
tags:
- framework
- decimal
- rounding
- Reflector
comments: true
---
My parents always told me to say what you mean and mean what you say.  It's good advice for life in general but even more so in software engineering.

I've been updating our online store back end jobs, which were still using legacy code, to use updated code to prepare for a database move that would have been impossible before.  At the same time, I'm trying to make the code more efficient and maintainable.

The new code threw an exception today from the e-commerce provider.  We were attempting to capture an amount that was more than what was authorized on the card.

<!-- more -->

In reality, after tax, the order total was \$21.625 after tax, which is stupid on its face to have fractional pennies, but that code is even nastier and I have very limited control over it.  When the store ran the credit authorization, it rounded down to \$21.62.  When my new code ran, it was rounded up (as most 5th graders would expect, you round 0.5 up) to \$21.63, hence the failure over a penny.

I dug up old code and found that the store authorization was using:

    decimal.Round(amount, 2)

Well, what does that mean exactly? I powered up [Reflector](http://www.red-gate.com/products/reflector/) and took a look at the guts of the method.  This was beyond interesting:

    // Original code
    decimal rounded1 = decimal.Round(amount, 2);
    // is equivalent to:
    decimal rounded2 = decimal.Round(amount, 2, MidpointRounding.ToEven);
    // and is completely different from
    decimal rounded3 = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);

MidpointRounding.AwayFromZero is exactly what I would expect from grade school. Using positive numbers, once you get halfway, you round up. With negative numbers, you would round down (to the larger negative).

MidpointRounding.ToEven is beyond weird to me. It rounds to the nearest even number.

This means that, with MidpointRounding.ToEven and rounding to 2 decimal places, 0.675 rounds to 0.68, as I would expect, but **0.685 ALSO rounds to 0.68!**

I don't know who came up with this or why, but it looks like internally, .NET uses a native extern method to accomplish even rounding, and a fairly complex but managed-code algorithm to accomplish away from zero rounding. Was the method that makes no sense to me or most 5th graders selected as the default because it is more efficient? I'm not sure I'll ever know.

The point is that as software developers we need to be cognizant of the framework code we utilize and what it's doing. We need to resist the urge to be lazy and use the more complex method overloads, and also throw in a comment to explain why.

Of course there are numerous types and methods in the .NET Framework that have similar problems. String.Compare() methods without the benefit of a string comparison type come to mind.

In any case, say (or rather, code) what you mean and mean what you code, and then you can avoid little gotchas like this.
