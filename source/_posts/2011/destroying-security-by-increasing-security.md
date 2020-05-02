---
layout: post
date: 2011-11-23
title: Destroying Security by Increasing Security
permalink: destroying-security-by-increasing-security
categories:
- Development
tags:
- security
- passwords
- xkcd
comments: true
---
I have a friend.  Let’s call him “Steve”.

Steve was recently complaining to me about the password requirements imposed on him by Corporate IT.  He was using all sorts of words to describe them.  The only one suitable for reprinting was “stupid”.  They went downhill from there rather quickly.

Here are the password requirements Steve has to live with:

-   Must contain at least one uppercase letter A-Z.
-   Must contain at least one lowercase letter a-z.
-   Must contain at least one numeral 0-9.
-   Must contain at least one special character
-   Must be longer than 6 characters. (So \>= 7)
-   Must be shorter than 9 characters. (So…7 or 8, but not 9)
-   Must begin and end with an alpha character A-Z or a-z.
-   The change periods (how often you must reset) vary.
-   You may not use any password you have used in the last year.

<!-- more -->

Seriously, did they just check every available box in the security setup? They may think they’re making things more secure, but in fact, the addition of all these options, especially with the addition of the very restrictive length requirement (7 or 8 characters, really?) conspires to *drastically reduce security*.

It reminded me a lot of this [XKCD comic](http://xkcd.com/936/):

[![](/images/password_strength.png)](http://xkcd.com/936/ "XKCD: Password Strength")

When you take social psychology into account, you can pretty much bet the farm on the following:

The requirements to change passwords several times a year and never repeat passwords in one year means that the month and date have to be in there.At the time of this writing, it is November 2011, so if I were trying to break a password on this system I could be reasonably sure that the password contains either 1111, 1011, 1110, 0911, 1109. That’s 5 possibilities.

It’s pretty safe to assume the date-based string of 4 characters will appear at the end of the password, but the fact that an alpha is required at the end means users will back it up one character. Therefore the password probably fits the regex [0-9]{4}[A-Za-z]\$. The addition of the letter (26 \* 2 for caps) possibilities means there are only 26\*2\*5 = 260 likely possibilities for the last 5 characters of the password.

If we assume 8 character passwords (would be stronger than 7 after all) then there are 3 characters left. It wouldn’t be ridiculous to assume:

-   First character caps: 26 possibilities
-   Second character lowercase: 26 possibilities
-   Third character a symbol easily reachable from a Shift+NumberKey sequence (there are 10) plus I’ll throw in a few more for good measure that are accessible by the right pinky finger.  Let’s say 20 possibilities.
-   Total possibilities for the first 3 chars = 26 \* 26 \* 20 = 13,520

Total likely passwords to attempt = 13,250 \* 260 = 3,515,200.

3.5 million possibilities.  Using XKCD’s assumption of 1000 guesses/second, that’s less than an hour! I sure hope they have some lockout routines on top of that password policy. Considering that they must have checked every box, I suppose I can assume they did.

You may disagree with my math or my assumptions, but that the point is that adding additional security requirements doesn’t always increase security. So get it out of your head that your users are going to pick truly random passwords and think about how they are likely to act before you consider your system to be secure.
