---
layout: post
date: 2012-12-18
title: Two subtle but powerful client-side UI tricks
permalink: two-subtle-but-powerful-client-side-ui-tricks
categories:
- Development
tags:
- source code
- jQuery
- JavaScript
- Backbone.js
- Twitter Bootstrap
- Trello
- LESS
comments: true
---
I thought I would two little tricks that are recent favorites of mine.

I've been doing a lot of client-side development with [Backbone.js](http://backbonejs.org/), [Twitter Bootstrap](http://twitter.github.com/bootstrap/), and LESS. Together they are powerful tools for creating a lot of beautiful client-side UI with complex interactions.

The two tricks I want to share are a CSS3 fade-in, and [Trello-inspired](https://trello.com/) drag-n-drop LESS mix-in.

<!-- more -->

# CSS3 Fade-In

When an application possesses a lot of features, you don't want the UI to be packed with all the kitchen-sink possibilities that the user could possibly employ. That would be confusing. That would be [Word 6](http://www.codinghorror.com/blog/2006/02/sometimes-a-word-is-worth-a-thousand-icons.html).

Instead I prefer to hide some of the functionality and bring it to the forefront as the user starts to interact with it, which usually boils down to hover. The activators for dropdown contextual menus can appear when you hover over something, or buttons can appear in the gutter between two items when the mouse is nearby.

The problem with this is that when you move the mouse quickly over a large swath of screen, the effect of all those items appearing and disappearing can be quite jarring.

> **Disclaimer:** This does not take touch devices (which obviously cannot hover) into account. If you need to support touch devices, you need to take steps to modify the layout so that these types of features are either always visible or accessible via other means.

The first step to this is having a reliable hover mechanism. In almost all of my JavaScript projects I usually include this bit of code:

    $(document).on('mouseover', '.on-hover', function() {
        $(this).addClass('hover');
    }).on('mouseout', '.on-hover', function(e) {
        $(this).removeClass('hover');
    });

This takes any element marked with the "on-hover" class and adds the "hover" class when it's being hovered upon. I'm sure my wife the editor will take issue with "hovered upon" but it seems the most straightforward description to me.

After this the LESS mixin is really simple.

    .visibleOnHover(@whenHidden: 0, @duration: 0.5s)
    {
        opacity: @whenHidden;
        transition: opacity @duration;
        &.hover
        {
            opacity: 1.0;
        }
    }

By default, this makes the item completely invisible until hovered over. You use it like this:

    .some-selector
    {
        // Invisible until hovered
        .visibleOnHover();
    }
    .another-selector
    {
        // Washed out until hovered, custom duration
        .visibleOnHover(0.3, 0.5s);
    }

I find that one really good use for the partially visible option (and the one included in the JSFiddle below) is an Add item on the end of a sortable list. It gives the impression that an item can be added without constantly dominating the screen with the add controls. Of course, if you are going to use it in this way, you probably also need to make sure the controls do not fade-out on mouseout if one of the controls within has focus.

Note that opacity as written isn't supported by Internet Explorer 6-8. However, this degrades fairly gracefully into always visible, so your effect is lost but at the very least the real business functionality should be fine. As always, test in whatever browsers you plan to support.

# Trello-style Drag-n-Drop

When you drag cards around in Trello, they get a nice drop shadow, they get rotated a little bit, and the cursor goes from a hand while you're hovering to a "grabbing" hand when dragging. It really gives you the impression that you are moving a 3D object up and over the 2D screen surface.

It turns out all this is easy with CSS3, and even easier as a LESS mixin.

    .grab()
    {
        cursor: move;
        cursor: -moz-grab;
        cursor: -webkit-grab;
        cursor: grab;
    }
    .grabbing()
    {
        cursor: move;
        cursor:-moz-grabbing;
        cursor:-webkit-grabbing;
        cursor:grabbing;
        box-shadow: -2px 5px 10px #333;
        -moz-transform:rotate(2deg);
        -webkit-transform: rotate(2deg);
        transform: rotate(2deg);
    }

I find no reason to parameterize this, because these values always seem to work for me. The one thing I could maybe see would be the rotation degrees, because something really LONG might look silly if you rotate it too much, where with something fairly small you usually don't notice.

The first cursor is designed for browsers that don't do the grab/grabbing icons, and looks like arrows pointing Up, Down, Left, and Right, which is a suitable substitute.

Usage is like this:

    .something-draggable
    {
        .grab();
    }
    .something-draggable.ui-sortable-helper
    {
        .grabbing();
    }

# Example

Check out examples of both of these tricks in the [JSFiddle below](http://jsfiddle.net/AzR82/):

