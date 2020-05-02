---
layout: post
date: 2012-01-11
title: 'Wanted: C# Property Initializers'
permalink: wanted-c-property-initializers
categories:
- Development
tags:
- C#
- syntactical sugar
comments: true
---
I love to write code and I’m a great typist, but I hate typing if it’s not necessary. I’m a big fan of [syntactical sugar](http://en.wikipedia.org/wiki/Syntactic_sugar) and I think it’s high time C\# got some more of it.

By now we’re all used to seeing this:

    public string MyProperty { get; set; }

 This eliminates the need to separately declare a private member variable and public property, because the compiler takes care of it for you.

What it doesn’t do is give you the option to set the initial value, like you could with a private member variable. Instead we have to do this:

    public class MyClass
    {
        public string MyProperty { get; set; }
        public MyClass()
        {
            MyProperty = "initial value";
        }
    }

 This really becomes more of a pain point now that I have delved into [NServiceBus](http://www.nservicebus.com) and [RavenDB](http://www.ravendb.net/). With NServiceBus, I create a lot of message classes, and when the message includes a collection, it’s usually a good idea to initialize the empty collection so that I don’t get annoying null reference exceptions when I try to use them. The same is true of RavenDB when creating objects with collections to persist to the document store.

What if we could do this?

    public string MyString { get; set; default "initial value"; }
    public List MyList { get; set; default new List(); }

It would personally save me a LOT of time.
