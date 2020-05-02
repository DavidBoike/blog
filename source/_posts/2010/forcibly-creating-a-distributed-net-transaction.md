---
layout: post
date: 2010-04-01
title: Forcibly creating a distributed .NET transaction
permalink: forcibly-creating-a-distributed-net-transaction
categories:
- Development
tags:
- NServiceBus
- transactions
- extension methods
comments: true
---
I've been working with [NServiceBus](http://www.nservicebus.com)and I ran across a problem with System.Transactions.

Basically, I wanted to do the following:

    public class RunAtStartup : IWantToRunAtStartup
    {
        public IBus Bus { get; set; }
        public void Run()
        {
            // ...doesn't matter
            using (TransactionScope ts = new TransactionScope())
            {
                // Do some database inserts/updates
                Bus.Send(msgToDoWork);
            }
        }
        public void Stop()
        {
        }
    }

This code blew up when I tried to send the message to the bus.

The problem is that because we still have SQL 2000 databases that cannot enlist in System.Transactions transactions without the performance penalty of distributed transactions, our database library uses a transaction adapter class that magically uses a SqlTransaction under the hood in a very lightweight manner. The error is the result of this library not being able to promote a local transaction to distributed, because MSMQ (used under the covers by NServiceBus) can only use distributed transactions.

<!-- more -->

In my search I ran across [Davy Brion's](http://davybrion.com/blog/) post [MSDTC Woes With NServiceBus And NHibernate](http://davybrion.com/blog/2010/03/msdtc-woes-with-nservicebus-and-nhibernate/) in which he shows a similar problem using NHibernate, database calls, and NServiceBus calls. His solution (which he calls a hack but I think is pretty elegant) is to enlist a durable resource manager at the beginning of the transaction that does nothing except to force the transaction to be distributed from the onset.

The only thing I didn't like was that it was a lot of code to remember to put as the first line of a transaction. So, I offer a simplification to his method:

    public static class TransactionScopeExtensions
    {
        public static TransactionScope EnsureDistributed(this TransactionScope ts)
        {
            Transaction.Current.EnlistDurable(DummyEnlistmentNotification.Id,
                new DummyEnlistmentNotification(),
                EnlistmentOptions.None);
            return ts;
        }
        internal class DummyEnlistmentNotification : IEnlistmentNotification
        {
            internal static readonly Guid Id =
                new Guid("E2D35055-4187-4ff5-82A1-F1F161A008D0");
            public void Prepare(PreparingEnlistment preparingEnlistment)
            {
                preparingEnlistment.Prepared();
            }
            public void Commit(Enlistment enlistment)
            {
                enlistment.Done();
            }
            public void Rollback(Enlistment enlistment)
            {
                enlistment.Done();
            }
            public void InDoubt(Enlistment enlistment)
            {
                enlistment.Done();
            }
        }
    }

DummyEnlistmentNotification is unchanged from the original implementation. The only difference is the use of an extension method on TransactionScope that also returns a TransactionScope. Now I can force a distributed transaction like this:

    using(TransactionScope ts = new TransactionScope().EnsureDistributed())
    {
        // do work
    }

And of course, this extension method is made available through Intellisense so that I don't have to think to remember how to do it.
