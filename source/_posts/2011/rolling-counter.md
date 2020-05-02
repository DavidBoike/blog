---
layout: post
date: 2011-04-30
title: Rolling Counter
permalink: rolling-counter
categories:
- Development
tags:
- source code
- LINQ
- diagnostics
- C#
comments: true
---
Sometimes I need a rolling counter, especially in diagnostics-related scenarios. How many requests have occurred in the last hour? It's not okay for a counter object to drop out of cache every hour, because the value will be meaningless if I happen to observe it at (Cache Drop + 3 minutes).

A real rolling counter is needed in these situations. The counter must increment, and then at some point those hits must drop off.

But especially in these situations, low impact is the key. A Queue where each item contains a timestamp is too unruly. Too many objects are created and too much cleanup is required. Less is more.

<!-- more -->

Here is a rolling counter class that is as low-impact as I can make it.

The client code selects a time duration (example 1 hour) and a resolution, orhow many time windows to track. The higher this resolution is, the finer grained the timer will appear to be. The lower it is, the choppier it will seem as greater numbers of hits are ejected at each window transition.

Based on the duration and resolution, the length of each time window is calculated (in milliseconds) and a timer is set up to advance to the next window and clear it on each timer tick.

The Hit() method increments the current window's counter, using Interlocked.Increment() to provide thread safety. The Total property sums the values in all windows to return the current count. I used a foreach loop to do the sum because in my limited performance testing, this was marginally faster than a for loop and much faster than a LINQ Sum().

If you cared about other interpretations of the values of the windows, you could implement these as additional properties, implementing with LINQ. For example, adding an Average method would allow a 1 hour, 60 resolution counter to return the total number of hits in the last hour or the average number of hits per minute for the last hour. The same could be said for Min(), Max(), or any other LINQ operator.

        public class RollingCounter
        {
            public TimeSpan Time { get; private set; }
            public int Resolution { get; private set; }
            private int[] counts;
            private int currentWindow = 0;
            private object padlock = new object();
            private Timer timer;
            public RollingCounter(TimeSpan time)
                : this(time, 10)
            {
            }
            public RollingCounter(TimeSpan time, int resolution)
            {
                if (time <= TimeSpan.Zero)
                    throw new ArgumentException("Time must be a positive TimeSpan.");
                if (resolution < 1)
                    throw new ArgumentException("Resolution must be a positive integer.");
                this.Time = time;
                this.Resolution = resolution;
                counts = new int[resolution];
                int windowMilliseconds = (int)(time.TotalMilliseconds / resolution);
                timer = new Timer(new TimerCallback(OnTimer), null, windowMilliseconds, windowMilliseconds);
            }
            private void OnTimer(object ignoreState)
            {
                currentWindow = (currentWindow + 1) % Resolution;
                counts[currentWindow] = 0;
            }
            public void Hit()
            {
                Interlocked.Increment(ref counts[currentWindow]);
            }
            public int Total
            {
                get
                {
                    int total = 0;
                    foreach(int c in counts)
                        total += c;
                    return total;
                }
            }
        }
