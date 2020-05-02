---
layout: post
date: 2011-07-26
title: System.Security.Cryptography and Thread Safety
permalink: system-security-cryptography-and-thread-safety
categories:
- Development
tags: []
comments: true
---
Are you experiencing either of these exceptions?

> **System.Security.Cryptography.CryptographicException**
>  Padding is invalid and cannot be removed.
>
> **System.IndexOutOfRangeException**
>  Index was outside the bounds of the array.
>
> **System.IndexOutOfRangeException**
>  Probable I/O race condition detected while copying memory. The I/O package is not thread safe by default. In multithreaded applications, a stream must be accessed in a thread-safe way, such as a thread-safe wrapper returned by TextReader's or TextWriter's Synchronized methods. This also applies to classes like StreamWriter and StreamReader.

 Well at least the last one is descriptive, but that is the LEAST likely to occur.

If you're seeing any of these exceptions, there's a good chance you've run afoul of a secret of the System.Cryptography namespace.  Almost nothing is thread safe.

It's an easy error to make. We know encryption is processor intensive, and it seems like it would be smart to incur the costs of setting up ICryptoTransform objects for encryptors and decryptors once and then store them in a static variable. Any state they might share would seem to be reference data like keys and salt and init vectors, so as long as we use a new CryptoStream for each operation, what could go wrong?

Well, lots.

Internally, the implementations of ICryptoTransform (and I assume other objects) use objects from the System.IO namespace like buffers and streams that we would never think of sharing between threads, but it's hard to know that from a simple call to ICryptoTransform.TransformBlock().

So, if you run into any of the exceptions above, try either creating your System.Cryptography objects each time you need them, or mark them with the ThreadStaticAttribute.  Remember that with [ThreadStatic], a static initializer will not execute for each thread, so check it for null before you use it, then initialize if null.
