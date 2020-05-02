---
layout: post
date: 2010-05-26
title: 'QR Codes: The lamest thing to never reach critical mass'
permalink: qr-codes-the-lamest-thing-to-never-reach-critical-mass
categories:
- Development
- Technology
tags:
- QR code
- Best Buy
comments: true
---
Last week in our development team meeting we had a discussion about QR Codes and whether or not there was a good reason to include QR reader functionality in future products.

For those unfamiliar, the short version (stolen from the Wikipedia linked above):

> A **QR Code** is a [matrix code](http://en.wikipedia.org/wiki/Barcode#Matrix_.282D.29_barcodes "Barcode") (or two-dimensional [bar code](http://en.wikipedia.org/wiki/Bar_code "Bar code")) created by Japanese corporation [Denso-Wave](http://en.wikipedia.org/wiki/Denso "Denso") in 1994. The "QR" is derived from "Quick Response", as the creator intended the code to allow its contents to be decoded at high speed.

My personal opinion, which I espoused during that meeting, was that QR codes are, for lack of a better word, stupid, that they would never appear in anything mainstream, had no potential return on investment, and that generally they were a complete and utter waste of time and we should go out of our way to avoid allocating *any* development time toward it.

<!-- more -->

And so what do I see in the Sunday paper just a few days later?  [Best Buy](http://www.bestbuy.com) included a QR code on the front page of their Sunday ad.  Thanks Best Buy.  Big help.

My typical admiration for Best Buy and all the things they have to sell me aside, I'm sticking with my opinion.

Here's an image of Best Buy's Sunday ad from May 23, 2010:

![Best Buy 5/23/2010 Ad with QR Code](/images/best-buy-5-23-ad-qr.jpg)

In order to use this thing, here's what you have to do:

1.  Text BBYAPP to an SMS shortcode.
2.  Receive a text message in return.
3.  Download the app teased in the message.
4.  Run app.
5.  Take a picture of the QR Code.
6.  Wait for it to process.
7.  Be sent to a website to watch a video trailer for Super Mario Galaxy 2.

 By the way, the website forced you to click a link to say whether you had an iPhone or an Android device.  No browser detection.  How very low-tech.

If that sounds hopelessly complicated, that's because it is.  This could have been accomplished by asking the user to visit bestbuy.com/mario (not a real link).

This fails a pretty simple metric I have for evaluating new software and technology.  If it feels cumbersome and overcomplicated to me, a software developer and self-proclaimed uber-geek, then it can never find general acceptance among the masses?

Of course, this isn't a perfect use of QR Code technology.  QR codes should follow the [Three Rules of QR Codes](http://2d-code.co.uk/three-rules-of-qr-codes/).  Briefly, they must 1) have a good mobile-device-appropriate landing page, 2) have a tiny url, and 3) lead to something valuable.  This Sunday ad doesn't outright fail, but doesn't exactly achieve stellar marks on \#1 or \#3.  The landing page is somewhat mobile ready, but should be able to tell iPhone and Android apart, and have some option for other devices.  More at issue is Rule 3 - a video is not all that valuable.  Offer me 10% off Super Mario Galaxy 2 and then maybe we have something to discuss.

To be fair, Best Buy is improving; previously they hung a QR code in a storefront window in New York City and this was an even bigger affront to Rule 3: it was only a link to the Best Buy mobile website.

So I maintain that QR codes will not catch on, because they can never reach the mainstream.  They are a digital chicken and the egg paradox.

1.  In order for end users to accept QR codes, they must be commonplace.  They must permeate our entire existence.  The term "QR" must be as well understood as "URL" is today.  My grandma (who uses the Internet and is a pretty hip lady, in my opinion) must know and understand what a QR code is and what it does.  "QR" must be a verb and be added to the Oxford dictionary.
2.  In order for publishers to make widespread use of QR codes, end users must have gained the acceptance of them.
3.  See \#1.

 So it won't happen.  Maybe UPS or Fedex will use them in their package tracking (actually I think one or both might already) but I won't know what it means and I won't care to as long as my latest order from Amazon makes it to my door.  But it will never reach critical mass.  And knowing this, I'd sure like to avoid wasting my time writing software to support it.
