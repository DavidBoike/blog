---
layout: post
date: 2011-02-08
title: Apple iOS Push Notifications with NServiceBus
permalink: apple-ios-push-notifications-with-nservicebus
categories:
- Development
tags:
- NServiceBus
- source code
- push notifications
- APNS
comments: true
---
I’m [no big fan of Apple’s Push Notifications API](http://www.make-awesome.com/2010/10/hey-apple-your-push-notifications-api-sucks/), but the fact is that iOS applications are no passing fad.  As developers providing server-side resources to mobile applications, our job is to do so as efficiently as possible.

For .NET developers able to commit financial resources, third party solutions such as Urban Airship can be the answer.  For developers wishing to control their own destiny, the open-source [apns-sharp](http://code.google.com/p/apns-sharp/) provides Apple push notifications and feedback services in a C\# library.

Considering the [ridiculous complexity of the Apple Push Notification format](http://www.make-awesome.com/2010/10/hey-apple-your-push-notifications-api-sucks/), it would behoove any developer to use apns-sharp instead of trying to re-invent the wheel.  NServiceBus together with apns-sharp would offer the reliability and scalability needed to successfully send push notifications for a high-capacity enterprise system.

Unfortunately, until recently apns-sharp and NServiceBus didn’t work and play well together.  I contributed to the apns-sharp to address these shortcomings.  In this article, I will describe how to use these modifications to apns-sharp to send push notifications with NServiceBus.

<!-- more -->

## Getting the apns-sharp library

 My changes to apns-sharp (Version 1.0.4) are not yet available in a binary download, so you’ll need to download and build the source.  apns-sharp is hosted in Google Code as a Subversion project.

You can check out the source from the [read-only Subversion repository](http://apns-sharp.googlecode.com/svn/trunk/).  For more details, visit the [Google Code Source Checkout](http://code.google.com/p/apns-sharp/source/checkout) page for the project.

**Note: This article is now out of date, as apns-sharp has now become [PushSharp](https://github.com/Redth/PushSharp).**

Open [JdSoft.Apple.Apns.sln](http://apns-sharp.googlecode.com/svn/trunk/JdSoft.Apple.Apns.sln) in Visual Studio 2010 (the free C\# Express version works just fine) and build it. The projects in the solution are:

-   **JdSoft.Apple.Apns.Notifications** – provides the central functionality of sending push notifications.
-   **JdSoft.Apple.Apns.Feedback** – provides the feedback service that you must run in order to remove subscribers that have uninstalled your application from their device.  Failure to do so could result in retribution from Apple in the form of cutting you off.
-   **JdSoft.Apple.AppStore** – provides receipt verification for in-app purchases.  I have not used this functionality myself.

## Sending Push Notifications

 The central trouble with push notifications and NServiceBus is that sending a push notification is completely non-transactional.  There is no way to rollback sending a push notification.

When performing non-transactional activities (other examples would include file system actions or calling web services) the usual guidance is to isolate the activity in its own NServiceBus message handler, and make the activity idempotent, meaning you can retry it over and over until you succeed with no ill effects.

Normally that would mean you would send push notifications one at a time, except you can’t do that either.  The SSL connection to Apple’s servers is computationally expensive to set up.  Even if it wasn’t, Apple’s own documentation hints that pinging Apple’s servers to death in such a way could get you cut off as well.

The best compromise is to create batches of messages and interact with Apple’s servers in such a way that successfully sent messages are not retried (to prevent duplicate messages being sent) and still ensuring that those that fail can be retried.

Here is the most basic message to send to a push notifications service:

    public class SendIOSAlertBatchCmd : IMessage
    {
        public SendIOSAlertBatchCmd()
        {
            Recipients = new List();
        }
        public string Text { get; set; }
        public DateTime? Expires { get; set; }
        public List Recipients { get; set; }
    }

The List of recipients contains the push identifiers that Apple provides to the device, which in turn the device sends to you via a web service of some sort.  Note that this is different from the device’s unique device ID!

Here is very basic source code to handle this message:

    public void Handle(SendIOSAlertBatchCmd msg)
    {
        List notifications = new List(msg.Recipients.Count);
        foreach (string pushID in msg.Recipients)
        {
            Notification n = new Notification(pushID);
            n.Payload.Alert.Body = msg.Text;
            n.Payload.Sound = "default";
            n.Expiration = msg.Expires;
            notifications.Add(n);
        }
        try
        {
            bool useSandbox = false;
            // The p12 file can also be loaded from a byte array, in case you keep it in a database.
            string p12FilePath = "push-notifications.p12";
            string p12FilePassword = "password";
            using (NotificationChannel channel = new NotificationChannel(useSandbox, p12FilePath, p12FilePassword))
            {
                channel.SendNotifications(notifications.ToArray());
            }
        }
        catch (NotificationBatchException bx)
        {
            foreach (NotificationDeliveryError err in bx.DeliveryErrors)
            {
                Notification erroredNotification = err.Notification;
                // Take action here to deal with error
            }
        }
    }

The NotificationBatchException is a rollup exception that encapsulates any error that may have occurred in sending push notifications.  The NotificationChannel.SendNotifications(Notification[]) will attempt to send every message in the array, reconnecting if necessary if Apple drops the connection in the middle.  Therefore, you can safely assume that any Notification that doesn’t surface in a NotificationBatchException was successfully sent.

This is a very basic framework – you have several options for how to deal with failures.

1.  Ignore them.  Most of the possible exceptions are problems that just shouldn’t happen the strongly-typed arena of .NET.  APNS uses a binary interface, so if you were doing it by hand, there’s all sorts of things that could go wrong, but the apns-sharp library insulates you from all that.  If your push notifications aren’t really all that important, this may be the easiest option.
2.  Send (or publish) a new message for each failed Notification.  The main goal is to assume the best and send a fair number of notifications in a batch.  If just one or two fail, it would be acceptable to deal with these in a separate handler one at a time.
3.  If you want to log in a database that each message was sent, you can change Recipients from a List to a List which includes a database primary key and the push ID.
    -   The Notification class provides a Tag property for storing user state, which you can use to store the IOSRecipient.  Then you can access the Tag property again, via the Notification, when handling any NotificationBatchException that may occur.
    -   This would enable you to publish one event message containing details of the successful pushes, and one or more messages for each failure, each to be taken care of in separate handlers.

 The important thing is that you can send many messages at once (batches of 100-500 work quite well) and isolate this work within one message handler, sending or publishing messages to separately deal with the messages that succeed and the messages that fail.

## Generating the .p12 Certificate File

 There is a lot of conflicting and just plain confusing information out on the Web about how to generate the .p12 file you need to use to authenticate to Apple. Here is the process that works for apns-sharp, along with a bit of commentary so you can actually understand what's going on.

1.  Generate a Certificate Signing Request file using the Mac keychain, as described in Apple's official documentation. The email address really doesn't seem to matter (just use the one you use for your iOS developer account) but the Common Name does - if you have many push notification certificates in your Keychain this will be the only thing that will help you tell them apart!
    -   What is not so obvious is that when the CSR file is generated, the CSR really only contains the public key part of the public/private key pair. The private key is kept in the Keychain. Switch to the Keys category and you will see it with the name you selected.

2.  Upload the CSR file to the Apple Developer Portal, and Apple will generate a certificate (.cer file) for you to download.
3.  Add this file to your Keychain (the login / default one) by dragging and dropping.
    -   At this point, the certificate (which embodies the public key, and the private key (already in the Keychain) recognize each other and meet up. If you look at the Certificates view, you will see the push notifications certificate, which you can expand to see the backing private key.
    -   The certificate has an awful name based on Apple-assigned IDs that mean nothing at face value - so you must expand it and look at the private key name in order to tell them apart.

4.  Here's where many run afoul of the Keychain. You must select the certificate, right-click (or control-click) and export it. **The important part for apns-sharp is to select the certificate and only the certificate. *Do not also select the private key*.**
5.  Select a filename to save the .p12 file. Then you must select a password to encrypt the .p12 file. After that you will likely need to enter your Keychain password to authorize exporting the private key (which needs to be kept secret, after all) out of the Keychain.
6.  The .p12 file that results, along with the password you selected, will work for the constructor of the NotificationChannel. Or, you can take the bytes of this file and load it into a database and use the constructor overload that takes a byte array.

 It really bothers me how much contradictory information is out there. I think some of it might have something to do with other APNS libraries such as [php-apns](http://code.google.com/p/php-apns/) have similar, but not compatible methods of reading the certificate information. So, I only guarantee this method to be suitable for use with apns-sharp.

If there is any way I can make this procedure more clear, please let me know.

## Conclusion

 With the apns-sharp library and NServiceBus you can send many push notifications at once (batches of 100-500 work quite well) and isolate the work within one NServiceBus message handler, sending or publishing messages to separately deal with messages that succeed and messages that fail.
