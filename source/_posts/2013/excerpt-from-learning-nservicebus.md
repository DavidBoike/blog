---
layout: post
date: 2013-11-12
title: Excerpt from Learning NServiceBus
permalink: excerpt-from-learning-nservicebus
categories:
- Development
tags:
- NServiceBus
- book
- training
comments: true
---
My publisher has allowed me to reprint my favorite part of my book, [Learning NServiceBus](http://www.packtpub.com/build-distributed-software-systems-using-dot-net-enterprise-service-bus/book), here on my blog. It is the introduction to Chapter 3, Preparing for Failure.

Why is it my favorite? Chapter 3 is the chapter that deals with how to be ready for the inevitable errors that will befall a system due to the [fallacies of distributed computing](http://en.wikipedia.org/wiki/Fallacies_of_Distributed_Computing), stupid user tricks, and plain outright buggy code. This is the part of NServiceBus that [really grabbed me in the beginning](/2011/02/my-nservicebus-moment-of-bliss/) and has never let go.

Plus, and I can’t stress this point enough, ***this is the part of the book about Batman***.

<!-- more -->

> Alfred: Why do we fall sir? So that we can learn to pick ourselves up.
> Bruce: You still haven't given up on me?
> Alfred: Never.
>
> -Batman Begins (Warner Bros., 2005)
>
> I'm sure that many readers are familiar with this scene from Christopher Nolan's Batman reboot. In fact, if you're like me, you can't read the words without hearing them in your head delivered by Michael Caine's distinguished British accent.
>
> At this point in the movie, Bruce and Alfred have narrowly escaped a blazing fire set by the Bad Guys that is burning Wayne Manor to the ground. Bruce had taken up the mantle of the Dark Knight to rid Gotham City of evil, and instead it seems as if evil has won, with the legacy of everything his family had built turning to ashes all around him.
>
> It is at this moment of failure that Alfred insists he will never give up on Bruce. I don't want to spoil the movie if, by chance, you haven't seen it, but let's just say some bad guys get what's coming to them.
>
> This quote has been on my mind from the past few months as my daughter has been learning to walk. Invariably she would fall and I would think of Alfred. I realized that this short exchange between Alfred and Bruce is a fitting analogy for the design philosophy of NServiceBus.
>
> Software fails. Software engineering is an imperfect discipline, and despite our best efforts, errors will happen. Some of us have surely felt like Bruce, when an unexpected error makes it seem as if the software we built is turning to so much ash around us.
>
> But like Alfred, NServiceBus will not give up. If we apply the tools that NServiceBus gives us, even in the face of failure, we will not lose consistency, we will not lose data, we can correct the error, and we will make it through.
>
> And then the bad guys will get what's coming to them.
>
> In this chapter we will explore the tools that NServiceBus gives us to stare failure in the face and laugh.

In the rest of the chapter, you learn about NServiceBus message handlers’ fault tolerance, error queues and replay, automatic and second-level retries, express and expiring messages, message auditing, and integration with web services.

If you’d like to read more, you can [download a preview of Chapter 1](http://www.packtpub.com/sites/default/files/9781782166344-chapter-01.pdf) from Packt, or buy the book from [Packt](http://www.packtpub.com/build-distributed-software-systems-using-dot-net-enterprise-service-bus/book), [Amazon](http://www.amazon.com/Learning-NServiceBus-David-Boike/dp/1782166343), [Amazon UK](http://www.amazon.co.uk/Learning-NServiceBus-David-Boike/dp/1782166343), or [Barnes & Noble](http://www.barnesandnoble.com/w/learning-nservicebus-david-boike/1116599194?ean=9781782166344).

Or, if you’d like to get formal NServiceBus training from me in person, you can attend the course I’ll be leading in December. Go to [training.ilmservice.com](http://training.ilmservice.com) for details and to register.
