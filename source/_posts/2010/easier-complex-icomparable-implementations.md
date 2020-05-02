---
layout: post
date: 2010-06-28
title: Easier Complex IComparable<T> Implementations
permalink: easier-complex-icomparable-implementations
categories:
- Development
tags:
- source code
- IComparable
comments: true
---
I know a lot of us are using the LINQ OrderBy() method to get our data shuffled in the right order, but on occasion I still do like implementing IComparable, especially when defining the default, intrinsic sort scheme for a particular class.

What I don't like is implementing IComparable when I want to compare on more than one thing.

I don't like this kind of code because the engineer in me balks at essentially doing each comparison more than once, first for equality, and then for direction:

<!-- more -->

    public int CompareTo(SomeObject other)
    {
        if (this.Prop1 != other.Prop1)
            return this.Prop1.CompareTo(other.Prop1);
        else if (this.Prop2 != other.Prop2)
            return this.Prop2.CompareTo(other.Prop2);
        // .... etc.
        return 0;
    }

However, expanding it to get rid of this double evaluation yields this nastiness:

    public int CompareTo(SomeObject other)
    {
        int cmp = this.Prop1.CompareTo(other.Prop1);
        if (cmp != 0)
        {
            cmp = this.Prop2.CompareTo(other.Prop2);
            if (cmp != 0)
                return cmp;
        }
        return 0;
    }

Yuck. I decided I needed a way to have some of the elegance of LINQ in an IComparable shell, and here it is:

    public class ComplexCompare
    {
        private int value;
        private ComplexCompare()
        {
        }
        public static ComplexCompare By(T a, T b)
        {
            return By(a, b, true);
        }
        public static ComplexCompare By(T a, T b, bool ascending)
        {
            ComplexCompare cc = new ComplexCompare();
            if (ascending)
                cc.value = Comparer.Default.Compare(a, b);
            else
                cc.value = Comparer.Default.Compare(b, a);
            return cc;
        }
        public static ComplexCompare By(T a, T b, IComparer comparer)
        {
            ComplexCompare cc = new ComplexCompare();
            cc.value = comparer.Compare(a, b);
            return cc;
        }
        public ComplexCompare ThenBy(T a, T b)
        {
            return ThenBy(a, b, true);
        }
        public ComplexCompare ThenBy(T a, T b, bool ascending)
        {
            // Only compare more specific items if the preceding items have been equal
            if (value == 0)
            {
                if (ascending)
                    this.value = Comparer.Default.Compare(a, b);
                else
                    this.value = Comparer.Default.Compare(b, a);
            }
            return this;
        }
        public int End()
        {
            return value;
        }
    }

ComplexCompare can be used like this:

    public int CompareTo(SomeObject other)
    {
        return ComplexCompare.By(this.Prop1, other.Prop1) // ascending by default
            .ThenBy(this.Prop2, other.Prop2, false) // but easy to change to descending
            .ThenBy(this.Prop3, other.Prop3) // each call can compare a completely different type
            .End(); // stops the fun and returns the int value
    }

Now a hardcore computer science person would tell me that all this extra abstraction adds overhead, and in a really tight loop with millions of rows, using this scheme to compare items would surely be catastrophic! However, I'm not usually one to give in to [Micro-Optimization Theater](http://www.codinghorror.com/blog/2009/01/the-sad-tragedy-of-micro-optimization-theater.html); I'm usually comparing 30-40 items, not millions. My primary concern is that code I write can be instantly understood when viewed by one of my peer developers, and I think ComplexCompare (although I'm not in love with the name) will help me to do that.
