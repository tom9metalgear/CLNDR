/**
 *               ~ CLNDR v1.3.4 ~
 * ==============================================
 *       https://github.com/kylestetz/CLNDR
 * ==============================================
 *  Created by kyle stetz (github.com/kylestetz)
 *       & available under the MIT license
 * http://opensource.org/licenses/mit-license.php
 * ==============================================
 *
 * This is the fully-commented development version of CLNDR.
 * For the production version, check out clndr.min.js
 * at https://github.com/kylestetz/CLNDR
 *
 * This work is based on the
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */
(function (factory) {
    // Multiple loading methods are supported depending on
    // what is available globally. While moment is loaded
    // here, the instance can be passed in at config time.
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'moment'], factory);
    }
    else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'), require('moment'));
    }
    else {
        // Browser globals
        factory(jQuery, moment);
    }
}(function ($, moment) {
    // Namespace
    var pluginName = 'clndr';

    // This is the default calendar template. This can be overridden.
    var clndrTemplate =
        "<div class='clndr-controls'>" +
            "<div class='clndr-control-button'>" +
                "<span class='clndr-previous-button'>previous</span>" +
            "</div>" +
            "<div class='month'><%= month %> <%= year %></div>" +
            "<div class='clndr-control-button rightalign'>" +
                "<span class='clndr-next-button'>next</span>" +
            "</div>" +
        "</div>" +
        "<table class='clndr-table' border='0' cellspacing='0' cellpadding='0'>" +
            "<thead>" +
                "<tr class='header-days'>" +
                "<% for(var i = 0; i < daysOfTheWeek.length; i++) { %>" +
                    "<td class='header-day'><%= daysOfTheWeek[i] %></td>" +
                "<% } %>" +
                "</tr>" +
            "</thead>" +
            "<tbody>" +
            "<% for(var i = 0; i < numberOfRows; i++){ %>" +
                "<tr>" +
                "<% for(var j = 0; j < 7; j++){ %>" +
                "<% var d = j + i * 7; %>" +
                    "<td class='<%= days[d].classes %>'>" +
                        "<div class='day-contents'><%= days[d].day %></div>" +
                    "</td>" +
                "<% } %>" +
                "</tr>" +
            "<% } %>" +
            "</tbody>" +
        "</table>";

    // Defaults used throughout the application, see docs.
    var defaults = {
        events: [],
        ready: null,
        extras: null,
        render: null,
        moment: null,
        weekOffset: 0,
        constraints: null,
        forceSixRows: null,
        selectedDate: null,
        doneRendering: null,
        daysOfTheWeek: null,
        multiDayEvents: null,
        startWithMonth: null,
        dateParameter: 'date',
        template: clndrTemplate,
        showAdjacentMonths: true,
        trackSelectedDate: false,
        adjacentDaysChangeMonth: false,
        ignoreInactiveDaysInSelection: null,
        lengthOfTime: {
            days: null,
            interval: 1,
            months: null
        },
        clickEvents: {
            click: null,
            today: null,
            nextYear: null,
            nextMonth: null,
            previousYear: null,
            onYearChange: null,
            previousMonth: null,
            onMonthChange: null,
        },
        targets: {
            day: 'day',
            empty: 'empty',
            nextButton: 'clndr-next-button',
            todayButton: 'clndr-today-button',
            previousButton: 'clndr-previous-button',
            nextYearButton: 'clndr-next-year-button',
            previousYearButton: 'clndr-previous-year-button'
        },
        classes: {
            past: "past",
            today: "today",
            event: "event",
            inactive: "inactive",
            selected: "selected",
            lastMonth: "last-month",
            nextMonth: "next-month",
            adjacentMonth: "adjacent-month"
        },
    };

    /**
     * The actual plugin constructor.
     * Parses the events and lengthOfTime options to build a calendar of day
     * objects containing event information from the events array.
     */
    function Clndr(element, options) {
        this.element = element;

        // Merge the default options with user-provided options
        this.options = $.extend(true, {}, defaults, options);

        // Check if moment was passed in as a dependency
        if (this.options.moment) {
            moment = this.options.moment;
        }

        // If there are events, we should run them through our
        // addMomentObjectToEvents function which will add a date object that
        // we can use to make life easier. This is only necessarywhen events
        // are provided on instantiation, since our setEvents function uses
        // addMomentObjectToEvents.
        if (this.options.events.length) {
            if (this.options.multiDayEvents) {
                this.options.events =
                    this.addMultiDayMomentObjectsToEvents(this.options.events);
            } else {
                this.options.events =
                    this.addMomentObjectToEvents(this.options.events);
            }
        }

        // This used to be a place where we'd figure out the current month,
        // but since we want to open up support for arbitrary lengths of time
        // we're going to store the current range in addition to the current
        // month.
        if (this.options.lengthOfTime.months || this.options.lengthOfTime.days) {
            // We want to establish intervalStart and intervalEnd, which will
            // keep track of our boundaries. Let's look at the possibilities...
            if (this.options.lengthOfTime.months) {
                // Gonna go right ahead and annihilate any chance for bugs here
                this.options.lengthOfTime.days = null;
                // The length is specified in months. Is there a start date?
                if (this.options.lengthOfTime.startDate) {
                    this.intervalStart =
                        moment(this.options.lengthOfTime.startDate)
                            .startOf('month');
                } else if (this.options.startWithMonth) {
                    this.intervalStart =
                        moment(this.options.startWithMonth)
                            .startOf('month');
                } else {
                    this.intervalStart = moment().startOf('month');
                }
                // Subtract a day so that we are at the end of the interval. We
                // always want intervalEnd to be inclusive.
                this.intervalEnd = moment(this.intervalStart)
                    .add(this.options.lengthOfTime.months, 'months')
                    .subtract(1, 'days');
                this.month = this.intervalStart.clone();
            }
            else if (this.options.lengthOfTime.days) {
                // The length is specified in days. Start date?
                if (this.options.lengthOfTime.startDate) {
                    this.intervalStart =
                        moment(this.options.lengthOfTime.startDate)
                            .startOf('day');
                } else {
                    this.intervalStart = moment().weekday(0).startOf('day');
                }
                this.intervalEnd = moment(this.intervalStart)
                    .add(this.options.lengthOfTime.days - 1, 'days')
                    .endOf('day');
                this.month = this.intervalStart.clone();
            }
        // No length of time specified so we're going to default into using the
        // current month as the time period.
        } else {
            this.month = moment().startOf('month');
            this.intervalStart = moment(this.month);
            this.intervalEnd = moment(this.month).endOf('month');
        }

        if (this.options.startWithMonth) {
            this.month = moment(this.options.startWithMonth).startOf('month');
            this.intervalStart = moment(this.month);
            this.intervalEnd = moment(this.month).endOf('month');
        }

        // If we've got constraints set, make sure the interval is within them.
        if (this.options.constraints) {
            // First check if the start date exists & is later than now.
            if (this.options.constraints.startDate) {
                var startMoment = moment(this.options.constraints.startDate);

                if (this.intervalStart.isBefore(startMoment, 'month')) {
                    // Try to preserve the date by moving only the month...
                    this.intervalStart
                        .set('month', startMoment.month())
                        .set('year', startMoment.year());
                    this.month
                        .set('month', startMoment.month())
                        .set('year', startMoment.year());
                }
            }
            // Make sure the intervalEnd is before the endDate
            if (this.options.constraints.endDate) {
                var endMoment = moment(this.options.constraints.endDate);

                if (this.intervalEnd.isAfter(endMoment, 'month')) {
                    this.intervalEnd
                        .set('month', endMoment.month())
                        .set('year', endMoment.year());
                    this.month
                        .set('month', endMoment.month())
                        .set('year', endMoment.year());
                }
            }
        }

        this._defaults = defaults;
        this._name = pluginName;

        // Some first-time initialization -> day of the week offset, template
        // compiling, making and storing some elements we'll need later, and
        // event handling for the controller.
        this.init();
    }

    /**
     * Calendar initialization.
     * Sets up the days of the week, the rendering function, binds all of the
     * events to the rendered calendar, and then stores the node locally.
     */
    Clndr.prototype.init = function () {
        // Create the days of the week using moment's current language setting
        this.daysOfTheWeek = this.options.daysOfTheWeek || [];

        if (!this.options.daysOfTheWeek) {
            this.daysOfTheWeek = [];

            for (var i = 0; i < 7; i++) {
                this.daysOfTheWeek.push(
                    moment().weekday(i).format('dd').charAt(0));
            }
        }

        // Shuffle the week if there's an offset
        if (this.options.weekOffset) {
            this.daysOfTheWeek = this.shiftWeekdayLabels(this.options.weekOffset);
        }

        // Quick and dirty test to make sure rendering is possible.
        if (!$.isFunction(this.options.render)) {
            this.options.render = null;

            if (typeof _ === 'undefined') {
                throw new Error(
                    "Underscore was not found. Please include underscore.js " +
                    "OR provide a custom render function.");
            } else {
                // We're just going ahead and using underscore here if no
                // render method has been supplied.
                this.compiledClndrTemplate = _.template(this.options.template);
            }
        }

        // Create the parent element that will hold the plugin and save it
        // for later
        $(this.element).html("<div class='clndr'></div>");
        this.calendarContainer = $('.clndr', this.element);

        // Attach event handlers for clicks on buttons/cells
        this.bindEvents();

        // Do a normal render of the calendar template
        this.render();

        // If a ready callback has been provided, call it.
        if (this.options.ready) {
            this.options.ready.apply(this, []);
        }
    };

    Clndr.prototype.shiftWeekdayLabels = function (offset) {
        var days = this.daysOfTheWeek;

        for (var i = 0; i < offset; i++) {
            days.push(days.shift());
        }

        return days;
    };

    /**
     * This is where the magic happens. Given a starting date and ending date,
     * an array of calendarDay objects is constructed that contains appropriate
     * events and classes depending on the circumstance.
     */
    Clndr.prototype.createDaysObject = function (startDate, endDate) {
        // This array will hold numbers for the entire grid (even the blank
        // spaces).
        var daysArray = [],
            date = startDate.clone(),
            lengthOfInterval = endDate.diff(startDate, 'days'),
            startOfLastMonth, endOfLastMonth, startOfNextMonth,
            endOfNextMonth, diff, dateIterator;

        // This is a helper object so that days can resolve their classes
        // correctly. Don't use it for anything please.
        this._currentIntervalStart = startDate.clone();

        // Filter the events list (if it exists) to events that are happening
        // last month, this month and next month (within the current grid view).
        this.eventsLastMonth = [];
        this.eventsNextMonth = [];
        this.eventsThisInterval = [];

        // Event parsing
        if (this.options.events.length) {
            // Here are the only two cases where we don't get an event in our
            // interval:
            //   startDate | endDate | e.start   | e.end
            //   e.start   | e.end   | startDate | endDate
            this.eventsThisInterval = $(this.options.events).filter(
                function () {
                    var afterEnd = this._clndrStartDateObject.isAfter(endDate),
                        beforeStart = this._clndrEndDateObject.isBefore(startDate);

                    if (beforeStart || afterEnd) {
                        return false;
                    } else {
                        return true;
                    }
                }).toArray();

            if (this.options.showAdjacentMonths) {
                startOfLastMonth = startDate.clone()
                    .subtract(1, 'months')
                    .startOf('month');
                endOfLastMonth = startOfLastMonth.clone().endOf('month');
                startOfNextMonth = endDate.clone()
                    .add(1, 'months')
                    .startOf('month');
                endOfNextMonth = startOfNextMonth.clone().endOf('month');

                this.eventsLastMonth = $(this.options.events).filter(
                    function () {
                        var beforeStart = this._clndrEndDateObject
                            .isBefore(startOfLastMonth);
                        var afterEnd = this._clndrStartDateObject
                            .isAfter(endOfLastMonth);

                        if (beforeStart || afterEnd) {
                            return false;
                        } else {
                            return true;
                        }
                    }).toArray();

                this.eventsNextMonth = $(this.options.events).filter(
                    function () {
                        var beforeStart = this._clndrEndDateObject
                            .isBefore(startOfNextMonth);
                        var afterEnd = this._clndrStartDateObject
                            .isAfter(endOfNextMonth);

                        if (beforeStart || afterEnd) {
                            return false;
                        } else {
                            return true;
                        }
                    }).toArray();
            }
        }

        // If diff is greater than 0, we'll have to fill in last days of the
        // previous month to account for the empty boxes in the grid. We also
        // need to take into account the weekOffset parameter. None of this
        // needs to happen if the interval is being specified in days rather
        // than months.
        if (!this.options.lengthOfTime.days) {
            diff = date.weekday() - this.options.weekOffset;

            if (diff < 0) {
                diff += 7;
            }

            if (this.options.showAdjacentMonths) {
                for (var i = 0; i < diff; i++) {
                    var day = moment([
                        startDate.year(),
                        startDate.month(),
                        i - diff + 1
                    ]);
                    daysArray.push(
                        this.createDayObject(
                            day,
                            this.eventsLastMonth
                        ));
                }
            } else {
                for (var i = 0; i < diff; i++) {
                    daysArray.push(
                        this.calendarDay({
                            classes: this.options.targets.empty +
                                " " + this.options.classes.lastMonth
                        }));
                }
            }
        }

        // Now we push all of the days in the interval
        dateIterator = startDate.clone();

        while (dateIterator.isBefore(endDate) || dateIterator.isSame(endDate, 'day')) {
            daysArray.push(
                this.createDayObject(
                    dateIterator.clone(),
                    this.eventsThisInterval
                ));
            dateIterator.add(1, 'days');
        }

        // ...and if there are any trailing blank boxes, fill those in with the
        // next month first days. Again, we can ignore this if the interval is
        // specified in days.
        if (!this.options.lengthOfTime.days) {
            while (daysArray.length % 7 !== 0) {
                if (this.options.showAdjacentMonths) {
                    daysArray.push(
                        this.createDayObject(
                            dateIterator.clone(),
                            this.eventsNextMonth
                        ));
                } else {
                    daysArray.push(
                        this.calendarDay({
                            classes: this.options.targets.empty + " " +
                                this.options.classes.nextMonth
                        }));
                }
                dateIterator.add(1, 'days');
            }
        }

        // If we want to force six rows of calendar, now's our Last Chance to
        // add another row. If the 42 seems explicit it's because we're
        // creating a 7-row grid and 6 rows of 7 is always 42!
        if (this.options.forceSixRows && daysArray.length !== 42) {
            while (daysArray.length < 42) {
                if (this.options.showAdjacentMonths) {
                    daysArray.push(
                        this.createDayObject(
                            dateIterator.clone(),
                            this.eventsNextMonth
                        ));
                    dateIterator.add(1, 'days');
                } else {
                    daysArray.push(
                        this.calendarDay({
                            classes: this.options.targets.empty + " " +
                                this.options.classes.nextMonth
                    }));
                }
            }
        }

        return daysArray;
    };

    Clndr.prototype.createDayObject = function (day, monthEvents) {
        var j = 0,
            self = this,
            now = moment(),
            eventsToday = [],
            extraClasses = "",
            properties = {
                isToday: false,
                isInactive: false,
                isAdjacentMonth: false
            },
            startMoment, endMoment, selectedMoment;

        // Validate moment date
        if (!day.isValid() && day.hasOwnProperty('_d') && day._d != undefined) {
            day = moment(day._d);
        }

        for (j; j < monthEvents.length; j++) {
            // Keep in mind that the events here already passed the month/year
            // test. Now all we have to compare is the moment.date(), which
            // returns the day of the month.
            var start = monthEvents[j]._clndrStartDateObject,
                end = monthEvents[j]._clndrEndDateObject;
            // If today is the same day as start or is after the start, and
            // if today is the same day as the end or before the end ...
            // woohoo semantics!
            if ( (day.isSame(start, 'day') || day.isAfter(start, 'day'))
                && (day.isSame(end, 'day') || day.isBefore(end, 'day')) )
            {
                eventsToday.push( monthEvents[j] );
            }
        }

        if (now.format("YYYY-MM-DD") == day.format("YYYY-MM-DD")) {
            extraClasses += (" " + this.options.classes.today);
            properties.isToday = true;
        }

        if (day.isBefore(now, 'day')) {
            extraClasses += (" " + this.options.classes.past);
        }

        if (eventsToday.length) {
            extraClasses += (" " + this.options.classes.event);
        }

        if (!this.options.lengthOfTime.days) {
            if (this._currentIntervalStart.month() > day.month()) {
                extraClasses += (" " + this.options.classes.adjacentMonth);
                properties.isAdjacentMonth = true;

                this._currentIntervalStart.year() === day.year()
                    ? extraClasses += (" " + this.options.classes.lastMonth)
                    : extraClasses += (" " + this.options.classes.nextMonth);
            }
            else if (this._currentIntervalStart.month() < day.month()) {
                extraClasses += (" " + this.options.classes.adjacentMonth);
                properties.isAdjacentMonth = true;

                this._currentIntervalStart.year() === day.year()
                    ? extraClasses += (" " + this.options.classes.nextMonth)
                    : extraClasses += (" " + this.options.classes.lastMonth);
            }
        }

        // If there are constraints, we need to add the inactive class to the
        // days outside of them
        if (this.options.constraints) {
            endMoment = moment(this.options.constraints.endDate);
            startMoment = moment(this.options.constraints.startDate);

            if (this.options.constraints.startDate && day.isBefore(startMoment) {
                extraClasses += (" " + this.options.classes.inactive);
                properties.isInactive = true;
            }

            if (this.options.constraints.endDate && day.isAfter(endMoment)) {
                extraClasses += (" " + this.options.classes.inactive);
                properties.isInactive = true;
            }
        }

        // Validate moment date
        if (!day.isValid() && day.hasOwnProperty('_d') && day._d != undefined) {
            day = moment(day._d);
        }

        // Check whether the day is "selected"
        selectedMoment = moment(this.options.selectedDate);

        if (this.options.selectedDate && day.isSame(selectedMoment, 'day')) {
            extraClasses += (" " + this.options.classes.selected);
        }

        // We're moving away from using IDs in favor of classes, since when
        // using multiple calendars on a page we are technically violating the
        // uniqueness of IDs.
        extraClasses += " calendar-day-" + day.format("YYYY-MM-DD");
        // Day of week
        extraClasses += " calendar-dow-" + day.weekday();

        return this.calendarDay({
            date: day,
            day: day.date(),
            events: eventsToday,
            properties: properties,
            classes: this.options.targets.day + extraClasses
        });
    };

    Clndr.prototype.render = function () {
        // Get rid of the previous set of calendar parts. This should handle garbage
        // collection according to jQuery's docs:
        //   http://api.jquery.com/empty/
        //   To avoid memory leaks, jQuery removes other constructs such as
        //   data and event handlers from the child elements before removing
        //   the elements themselves.
        var data = {},
            end = null,
            start = null,
            oneYearFromEnd = this.intervalEnd.clone().add(1, 'years'),
            oneYearAgo = this.intervalStart.clone().subtract(1, 'years'),
            days, months, currentMonth, eventsThisInterval;
        this.calendarContainer.empty();

        if (this.options.lengthOfTime.days) {
            days = this.createDaysObject(
                this.intervalStart.clone(),
                this.intervalEnd.clone());
            data = {
                days: days,
                months: [],
                year: null,
                month: null,
                eventsLastMonth: [],
                eventsNextMonth: [],
                extras: this.options.extras,
                daysOfTheWeek: this.daysOfTheWeek,
                intervalEnd: this.intervalEnd.clone(),
                numberOfRows: Math.ceil(days.length / 7),
                intervalStart: this.intervalStart.clone(),
                eventsThisInterval: this.eventsThisInterval
            };
        }
        else if (this.options.lengthOfTime.months) {
            months = [];
            eventsThisInterval = [];

            for (i = 0; i < this.options.lengthOfTime.months; i++) {
                var currentIntervalStart = this.intervalStart
                    .clone()
                    .add(i, 'months'),
                var currentIntervalEnd = currentIntervalStart
                    .clone()
                    .endOf('month');
                var days = this.createDaysObject(
                    currentIntervalStart,
                    currentIntervalEnd);
                // Save events processed for each month into a master array of
                // events for this interval
                eventsThisInterval.push(this.eventsThisInterval);
                months.push({
                    days: days,
                    month: currentIntervalStart
                });
            }

            data = {
                days: [],
                year: null,
                month: null,
                months: months,
                extras: this.options.extras,
                intervalEnd: this.intervalEnd,
                intervalStart: this.intervalStart,
                daysOfTheWeek: this.daysOfTheWeek,
                eventsLastMonth: this.eventsLastMonth,
                eventsNextMonth: this.eventsNextMonth,
                eventsThisInterval: eventsThisInterval,
                // @TODO -- remove _.reduce to remove underscore dependency
                numberOfRows: _.reduce(months, function (memo, monthObj) {
                    return memo + Math.ceil(monthObj.days.length / 7);
                }, 0)
            };
        }
        else {
            // Get an array of days and blank spaces
            days = this.createDaysObject(
                this.month.clone().startOf('month'),
                this.month.clone().endOf('month'));
            // This is to prevent a scope/naming issue between this.month and
            // data.month
            currentMonth = this.month;

            data = {
                days: days,
                months: [],
                year: this.month.year(),
                extras: this.options.extras,
                month: this.month.format('MMMM'),
                daysOfTheWeek: this.daysOfTheWeek,
                eventsLastMonth: this.eventsLastMonth,
                eventsNextMonth: this.eventsNextMonth,
                numberOfRows: Math.ceil(days.length / 7),
                eventsThisMonth: this.eventsThisInterval
            };
        }

        // Render the calendar with the data above & bind events to its
        // elements
        if ( !this.options.render) {
            this.calendarContainer.html(
                this.compiledClndrTemplate(data));
        } else {
            this.calendarContainer.html(
                this.options.render.apply(this, [data]));
        }

        // If there are constraints, we need to add the 'inactive' class to
        // the controls.
        if (this.options.constraints) {
            // In the interest of clarity we're just going to remove all
            // inactive classes and re-apply them each render.
            for (var target in this.options.targets) {
                if (target != this.options.targets.day) {
                    this.element.find('.' + this.options.targets[target])
                        .toggleClass(
                            this.options.classes.inactive,
                            false);
                }
            }

            if (this.options.constraints.startDate) {
                start = moment(this.options.constraints.startDate);
            }

            if (this.options.constraints.endDate) {
                end = moment(this.options.constraints.endDate);
            }

            // Deal with the month controls first. Do we have room to go back?
            if (start
                && (start.isAfter(this.intervalStart)
                    || start.isSame(this.intervalStart, 'day')))
            {
                this.element.find('.' + this.options.targets.previousButton)
                    .toggleClass(this.options.classes.inactive, true);
            }

            // Do we have room to go forward?
            if (end
                && (end.isBefore(this.intervalEnd)
                    || end.isSame(this.intervalEnd, 'day')))
            {
                this.element.find('.' + this.options.targets.nextButton)
                    .toggleClass(this.options.classes.inactive, true);
            }

            // What's last year looking like?
            if (start && start.isAfter(oneYearAgo)) {
                this.element.find('.' + this.options.targets.previousYearButton)
                    .toggleClass(this.options.classes.inactive, true);
            }

            // How about next year?
            if (end && end.isBefore(oneYearFromEnd)) {
                this.element.find('.' + this.options.targets.nextYearButton)
                    .toggleClass(this.options.classes.inactive, true);
            }

            // Today? We could put this in init(), but we want to support the
            // user changing the constraints on a living instance.
            if ( (start && start.isAfter( moment(), 'month' ))
                || (end && end.isBefore( moment(), 'month' )) )
            {
                this.element.find('.' + this.options.targets.today)
                    .toggleClass(this.options.classes.inactive, true);
            }
        }

        if (this.options.doneRendering) {
            this.options.doneRendering.apply(this, []);
        }
    };

    Clndr.prototype.bindEvents = function() {
        var self = this,
            $container = $(this.element),
            targets = this.options.targets,
            classes = self.options.classes,
            eventType = (this.options.useTouchEvents === true)
                ? 'touchstart'
                : 'click',
            eventName = eventType + '.clndr';

        // Make sure we don't already have events
        $container
            .off(eventName, '.' + targets.day)
            .off(eventName, '.' + targets.empty)
            .off(eventName, '.' + targets.previousButton)
            .off(eventName, '.' + targets.nextButton)
            .off(eventName, '.' + targets.todayButton)
            .off(eventName, '.' + targets.nextYearButton)
            .off(eventName, '.' + targets.previousYearButton);

        // Target the day elements and give them click events
        $container.on(eventName, '.' + targets.day, function (event) {
            var currentTarget = $(event.currentTarget),
                target;

            if (self.options.clickEvents.click) {
                target = self.buildTargetObject(event.currentTarget, true);
                self.options.clickEvents.click.apply(self, [target]);
            }

            // If adjacentDaysChangeMonth is on, we need to change the
            // month here.
            if (self.options.adjacentDaysChangeMonth) {
                if ($currentTarget.is('.' + classes.lastMonth)) {
                    self.backActionWithContext(self);
                }
                else if ($currentTarget.is('.' + classes.nextMonth)) {
                    self.forwardActionWithContext(self);
                }
            }

            // if trackSelectedDate is on, we need to handle click on a new day
            if (self.options.trackSelectedDate) {
                if (self.options.ignoreInactiveDaysInSelection
                    && $currentTarget.hasClass(classes.inactive))
                {
                    return;
                }

                // Remember new selected date
                self.options.selectedDate =
                    self.getTargetDateString(event.currentTarget);
                // Handle "selected" class
                $currentTarget
                    .siblings().removeClass(classes.selected).end()
                    .addClass(classes.selected);
            }
        });

        // Target the empty calendar boxes as well
        $container.on(eventName, '.' + targets.empty, function (event) {
            var $eventTarget = $(event.currentTarget),
                target;

            if (self.options.clickEvents.click) {
                target = self.buildTargetObject(event.currentTarget, false);
                self.options.clickEvents.click.apply(self, [target]);
            }

            if (self.options.adjacentDaysChangeMonth) {
                if ($eventTarget.is('.' + classes.lastMonth)) {
                    self.backActionWithContext(self);
                }
                else if ($eventTarget.is('.' + classes.nextMonth)) {
                    self.forwardActionWithContext(self);
                }
            }
        });

        // Bind the previous, next and today buttons. We pass the current
        // context along with the event so that it can update this instance.
        data = {
            context: this
        };

        $container
            on(eventName, '.' + targets.previousButton, data, this.backAction)
            on(eventName, '.' + targets.nextButton, data, this.forwardAction)
            on(eventName, '.' + targets.todayButton, data, this.todayAction)
            on(eventName, '.' + targets.nextYearButton, data, this.nextYearAction)
            on(eventName, '.' + targets.previousYearButton, data, this.previousYearAction);
    };

  // If the user provided a click callback we'd like to give them something nice to work with.
  // buildTargetObject takes the DOM element that was clicked and returns an object with
  // the DOM element, events, and the date (if the latter two exist). Currently it is based on the id,
  // however it'd be nice to use a data- attribute in the future.
  Clndr.prototype.buildTargetObject = function(currentTarget, targetWasDay) {
    // This is our default target object, assuming we hit an empty day with no events.
    var target = {
      element: currentTarget,
      events: [],
      date: null
    };
    // did we click on a day or just an empty box?
    if(targetWasDay) {
      var dateString = this.getTargetDateString(currentTarget);
      target.date = (dateString) ? moment(dateString) : null;

      // do we have events?
      if(this.options.events) {
        // are any of the events happening today?
        if(this.options.multiDayEvents) {
          target.events = $.makeArray( $(this.options.events).filter( function() {
            // filter the dates down to the ones that match.
            return ( ( target.date.isSame(this._clndrStartDateObject, 'day') || target.date.isAfter(this._clndrStartDateObject, 'day') ) &&
              ( target.date.isSame(this._clndrEndDateObject, 'day') || target.date.isBefore(this._clndrEndDateObject, 'day') ) );
          }) );
        } else {
          target.events = $.makeArray( $(this.options.events).filter( function() {
            // filter the dates down to the ones that match.
            return this._clndrStartDateObject.format('YYYY-MM-DD') == dateString;
          }) );
        }
      }
    }

    return target;
  };

  // get moment date object of the date associated with the given target.
  // this method is meant to be called on ".day" elements.
  Clndr.prototype.getTargetDateString = function(target) {
    // Our identifier is in the list of classNames. Find it!
    var classNameIndex = target.className.indexOf('calendar-day-');
    if(classNameIndex !== -1) {
      // our unique identifier is always 23 characters long.
      // If this feels a little wonky, that's probably because it is.
      // Open to suggestions on how to improve this guy.
      return target.className.substring(classNameIndex + 13, classNameIndex + 23);
    }

    return null;
  };

  // the click handlers in bindEvents need a context, so these are wrappers
  // to the actual functions. Todo: better way to handle this?
  Clndr.prototype.forwardAction = function(event) {
    var self = event.data.context;
    self.forwardActionWithContext(self);
  };

  Clndr.prototype.backAction = function(event) {
    var self = event.data.context;
    self.backActionWithContext(self);
  };

  // These are called directly, except for in the bindEvent click handlers,
  // where forwardAction and backAction proxy to these guys.
  Clndr.prototype.backActionWithContext = function(self) {
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.previousButton).hasClass('inactive')) {
      return;
    }

    var yearChanged = null;

    if(!self.options.lengthOfTime.days) {
      // shift the interval by a month (or several months)
      self.intervalStart.subtract(self.options.lengthOfTime.interval, 'months').startOf('month');
      self.intervalEnd = self.intervalStart.clone().add(self.options.lengthOfTime.months || self.options.lengthOfTime.interval, 'months').subtract(1, 'days').endOf('month');

      if(!self.options.lengthOfTime.months) {
        yearChanged = !self.month.isSame( moment(self.month).subtract(1, 'months'), 'year');
      }

      self.month = self.intervalStart.clone();
    } else {
      // shift the interval in days
      self.intervalStart.subtract(self.options.lengthOfTime.interval, 'days').startOf('day');
      self.intervalEnd = self.intervalStart.clone().add(self.options.lengthOfTime.days - 1, 'days').endOf('day');
      // this is useless, i think, but i'll keep it as a precaution for now
      self.month = self.intervalStart.clone();
    }

    self.render();

    if(!self.options.lengthOfTime.days && !self.options.lengthOfTime.months) {
      if(self.options.clickEvents.previousMonth) {
        self.options.clickEvents.previousMonth.apply( self, [moment(self.month)] );
      }
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      if(yearChanged) {
        if(self.options.clickEvents.onYearChange) {
          self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
        }
      }
    } else {
      if(self.options.clickEvents.previousInterval) {
        self.options.clickEvents.previousInterval.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
      if(self.options.clickEvents.onIntervalChange) {
        self.options.clickEvents.onIntervalChange.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
    }
  };

  Clndr.prototype.forwardActionWithContext = function(self) {
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.nextButton).hasClass('inactive')) {
      return;
    }

    var yearChanged = null;

    if(!self.options.lengthOfTime.days) {
      // shift the interval by a month (or several months)
      self.intervalStart.add(self.options.lengthOfTime.interval, 'months').startOf('month');
      self.intervalEnd = self.intervalStart.clone().add(self.options.lengthOfTime.months || self.options.lengthOfTime.interval, 'months').subtract(1, 'days').endOf('month');

      if(!self.options.lengthOfTime.months) {
        yearChanged = !self.month.isSame( moment(self.month).add(1, 'months'), 'year');
      }

      self.month = self.intervalStart.clone();
    } else {
      // shift the interval in days
      self.intervalStart.add(self.options.lengthOfTime.interval, 'days').startOf('day');
      self.intervalEnd = self.intervalStart.clone().add(self.options.lengthOfTime.days - 1, 'days').endOf('day');
      // this is useless, i think, but i'll keep it as a precaution for now
      self.month = self.intervalStart.clone();
    }

    self.render();

    if(!self.options.lengthOfTime.days && !self.options.lengthOfTime.months) {
      if(self.options.clickEvents.nextMonth) {
        self.options.clickEvents.nextMonth.apply( self, [moment(self.month)] );
      }
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      if(yearChanged) {
        if(self.options.clickEvents.onYearChange) {
          self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
        }
      }
    } else {
      if(self.options.clickEvents.nextInterval) {
        self.options.clickEvents.nextInterval.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
      if(self.options.clickEvents.onIntervalChange) {
        self.options.clickEvents.onIntervalChange.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
    }
  };

  Clndr.prototype.todayAction = function(event) {
    var self = event.data.context;

    // did we switch months when the today button was hit?
    var monthChanged = !self.month.isSame(moment(), 'month');
    var yearChanged = !self.month.isSame(moment(), 'year');

    self.month = moment().startOf('month');

    if(self.options.lengthOfTime.days) {
      // if there was a startDate specified, we should figure out what the weekday is and
      // use that as the starting point of our interval. If not, go to today.weekday(0)
      if(self.options.lengthOfTime.startDate) {
        self.intervalStart = moment().weekday(self.options.lengthOfTime.startDate.weekday()).startOf('day');
      } else {
        self.intervalStart = moment().weekday(0).startOf('day');
      }
      self.intervalEnd = self.intervalStart.clone().add(self.options.lengthOfTime.days - 1, 'days').endOf('day');

    } else if(self.options.lengthOfTime.months) {
      // set the intervalStart to this month.
      self.intervalStart = moment().startOf('month');
      self.intervalEnd = self.intervalStart.clone()
        .add(self.options.lengthOfTime.months || self.options.lengthOfTime.interval, 'months')
        .subtract(1, 'days')
        .endOf('month');
    } else if(monthChanged) {
      // reset the start interval for the current month
      self.intervalStart = moment().startOf('month');
      // no need to re-render if we didn't change months.
      self.render();

      // fire the today event handler regardless of whether the month changed.
      if(self.options.clickEvents.today) {
        self.options.clickEvents.today.apply( self, [moment(self.month)] );
      }

      // fire the onMonthChange callback
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      // maybe fire the onYearChange callback?
      if(yearChanged) {
        if(self.options.clickEvents.onYearChange) {
          self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
        }
      }
    }

    if(self.options.lengthOfTime.days || self.options.lengthOfTime.months) {
      self.render();
      // fire the today event handler regardless of whether the month changed.
      if(self.options.clickEvents.today) {
        self.options.clickEvents.today.apply( self, [moment(self.month)] );
      }
      if(self.options.clickEvents.onIntervalChange) {
        self.options.clickEvents.onIntervalChange.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
    }
  };

  Clndr.prototype.nextYearAction = function(event) {
    var self = event.data.context;
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.nextYearButton).hasClass('inactive')) {
      return;
    }

    self.month.add(1, 'years');
    self.intervalStart.add(1, 'years');
    self.intervalEnd.add(1, 'years');

    self.render();

    if(self.options.clickEvents.nextYear) {
      self.options.clickEvents.nextYear.apply( self, [moment(self.month)] );
    }
    if(self.options.lengthOfTime.days || self.options.lengthOfTime.months) {
      if(self.options.clickEvents.onIntervalChange) {
        self.options.clickEvents.onIntervalChange.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
    } else {
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      if(self.options.clickEvents.onYearChange) {
        self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
      }
    }
  };

  Clndr.prototype.previousYearAction = function(event) {
    var self = event.data.context;
    // before we do anything, check if there is an inactive class on the month control.
    // if it does, we want to return and take no action.
    if(self.element.find('.' + self.options.targets.previousYearButton).hasClass('inactive')) {
      return;
    }

    self.month.subtract(1, 'years');
    self.intervalStart.subtract(1, 'years');
    self.intervalEnd.subtract(1, 'years');

    self.render();

    if(self.options.clickEvents.previousYear) {
      self.options.clickEvents.previousYear.apply( self, [moment(self.month)] );
    }
    if(self.options.lengthOfTime.days || self.options.lengthOfTime.months) {
      if(self.options.clickEvents.onIntervalChange) {
        self.options.clickEvents.onIntervalChange.apply( self, [moment(self.intervalStart), moment(self.intervalEnd)] );
      }
    } else {
      if(self.options.clickEvents.onMonthChange) {
        self.options.clickEvents.onMonthChange.apply( self, [moment(self.month)] );
      }
      if(self.options.clickEvents.onYearChange) {
        self.options.clickEvents.onYearChange.apply( self, [moment(self.month)] );
      }
    }
  };

  Clndr.prototype.forward = function(options) {
    if(!this.options.lengthOfTime.days) {
      // shift the interval by a month (or several months)
      this.intervalStart.add(this.options.lengthOfTime.interval, 'months').startOf('month');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.months || this.options.lengthOfTime.interval, 'months').subtract(1, 'days').endOf('month');
      this.month = this.intervalStart.clone();
    } else {
      // shift the interval in days
      this.intervalStart.add(this.options.lengthOfTime.interval, 'days').startOf('day');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.days - 1, 'days').endOf('day');
      this.month = this.intervalStart.clone();
    }

    this.render();

    if(options && options.withCallbacks) {
      if(this.options.lengthOfTime.days || this.options.lengthOfTime.months) {
        if(this.options.clickEvents.onIntervalChange) {
          this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
        }
      } else {
        if(this.options.clickEvents.onMonthChange) {
          this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
        }
        // We entered a new year
        if (this.month.month() === 0 && this.options.clickEvents.onYearChange) {
          this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
        }
      }
    }

    return this;
  };

  Clndr.prototype.back = function(options) {
    if(!this.options.lengthOfTime.days) {
      // shift the interval by a month (or several months)
      this.intervalStart.subtract(this.options.lengthOfTime.interval, 'months').startOf('month');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.months || this.options.lengthOfTime.interval, 'months').subtract(1, 'days').endOf('month');
      this.month = this.intervalStart.clone();
    } else {
      // shift the interval in days
      this.intervalStart.subtract(this.options.lengthOfTime.interval, 'days').startOf('day');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.days - 1, 'days').endOf('day');
      this.month = this.intervalStart.clone();
    }

    this.render();

    if(options && options.withCallbacks) {
      if(this.options.lengthOfTime.days || this.options.lengthOfTime.months) {
        if(this.options.clickEvents.onIntervalChange) {
          this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
        }
      } else {
        if(this.options.clickEvents.onMonthChange) {
          this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
        }
        // We went all the way back to previous year
        if (this.month.month() === 11 && this.options.clickEvents.onYearChange) {
          this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
        }
      }
    }

    return this;
  };

  // alternate names for convenience
  Clndr.prototype.next = function(options) {
    this.forward(options);
    return this;
  };

  Clndr.prototype.previous = function(options) {
    this.back(options);
    return this;
  }

  Clndr.prototype.setMonth = function(newMonth, options) {
    // accepts 0 - 11 or a full/partial month name e.g. "Jan", "February", "Mar"
    if(!this.options.lengthOfTime.days && !this.options.lengthOfTime.months) {
      this.month.month(newMonth);
      this.intervalStart = this.month.clone().startOf('month');
      this.intervalEnd = this.intervalStart.clone().endOf('month');
      this.render();
      if(options && options.withCallbacks) {
        if(this.options.clickEvents.onMonthChange) {
          this.options.clickEvents.onMonthChange.apply( this, [moment(this.month)] );
        }
      }
    } else {
      console.log('You are using a custom date interval; use Clndr.setIntervalStart(startDate) instead.');
    }
    return this;
  }

  Clndr.prototype.setIntervalStart = function(newDate, options) {
    // accepts a date string or moment object
    if(this.options.lengthOfTime.days) {
      this.intervalStart = moment(newDate).startOf('day');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.days - 1, 'days').endOf('day');
    } else if(this.options.lengthOfTime.months) {
      this.intervalStart = moment(newDate).startOf('month');
      this.intervalEnd = this.intervalStart.clone().add(this.options.lengthOfTime.months || this.options.lengthOfTime.interval, 'months').subtract(1, 'days').endOf('month');
      this.month = this.intervalStart.clone();
    }

    if(this.options.lengthOfTime.days || this.options.lengthOfTime.months) {
      this.render();

      if(options && options.withCallbacks) {
        if(this.options.clickEvents.onIntervalChange) {
          this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
        }
      }
    } else {
      console.log('You are using a custom date interval; use Clndr.setIntervalStart(startDate) instead.');
    }
    return this;
  }

  Clndr.prototype.nextYear = function(options) {
    this.month.add(1, 'year');
    this.intervalStart.add(1, 'year');
    this.intervalEnd.add(1, 'year');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
      if(this.options.clickEvents.onIntervalChange) {
        this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
      }
    }
    return this;
  };

  Clndr.prototype.previousYear = function(options) {
    this.month.subtract(1, 'year');
    this.intervalStart.subtract(1, 'year');
    this.intervalEnd.subtract(1, 'year');
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
      if(this.options.clickEvents.onIntervalChange) {
        this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
      }
    }
    return this;
  };

  Clndr.prototype.setYear = function(newYear, options) {
    this.month.year(newYear);
    this.intervalStart.year(newYear);
    this.intervalEnd.year(newYear);
    this.render();
    if(options && options.withCallbacks) {
      if(this.options.clickEvents.onYearChange) {
        this.options.clickEvents.onYearChange.apply( this, [moment(this.month)] );
      }
      if(this.options.clickEvents.onIntervalChange) {
        this.options.clickEvents.onIntervalChange.apply( this, [moment(this.intervalStart), moment(this.intervalEnd)] );
      }
    }
    return this;
  };

  Clndr.prototype.setEvents = function(events) {
    // go through each event and add a moment object
    if(this.options.multiDayEvents) {
      this.options.events = this.addMultiDayMomentObjectsToEvents(events);
    } else {
      this.options.events = this.addMomentObjectToEvents(events);
    }

    this.render();
    return this;
  };

  Clndr.prototype.addEvents = function(events) {
    // go through each event and add a moment object
    if(this.options.multiDayEvents) {
      this.options.events = $.merge(this.options.events, this.addMultiDayMomentObjectsToEvents(events));
    } else {
      this.options.events = $.merge(this.options.events, this.addMomentObjectToEvents(events));
    }

    this.render();
    return this;
  };

  Clndr.prototype.removeEvents = function(matchingFunction) {
    for (var i = this.options.events.length-1; i >= 0; i--) {
      if(matchingFunction(this.options.events[i]) == true) {
        this.options.events.splice(i, 1);
      }
    }

    this.render();
    return this;
  };

  Clndr.prototype.addMomentObjectToEvents = function(events) {
    var self = this;
    var i = 0, l = events.length;
    for(i; i < l; i++) {
      // add the date as both start and end, since it's a single-day event by default
      events[i]._clndrStartDateObject = moment( events[i][self.options.dateParameter] );
      events[i]._clndrEndDateObject = moment( events[i][self.options.dateParameter] );
    }
    return events;
  };

  Clndr.prototype.addMultiDayMomentObjectsToEvents = function(events) {
    var self = this;
    var i = 0, l = events.length;
    for(i; i < l; i++) {
      // if we don't find the startDate OR endDate fields, look for singleDay
      if(!events[i][self.options.multiDayEvents.endDate] && !events[i][self.options.multiDayEvents.startDate]) {
        events[i]._clndrEndDateObject = moment( events[i][self.options.multiDayEvents.singleDay] );
        events[i]._clndrStartDateObject = moment( events[i][self.options.multiDayEvents.singleDay] );
      } else {
        // otherwise use startDate and endDate, or whichever one is present.
        events[i]._clndrEndDateObject = moment( events[i][self.options.multiDayEvents.endDate] || events[i][self.options.multiDayEvents.startDate] );
        events[i]._clndrStartDateObject = moment( events[i][self.options.multiDayEvents.startDate] || events[i][self.options.multiDayEvents.endDate] );
      }
    }
    return events;
  };

  Clndr.prototype.calendarDay = function(options) {
    var defaults = { day: "", classes: this.options.targets.empty, events: [], date: null };
    return $.extend({}, defaults, options);
  }

  Clndr.prototype.destroy = function() {
    var $container = $( this.calendarContainer );
    $container.parent().data( 'plugin_clndr', null );
    this.options = defaults;
    $container.empty().remove();
    this.element = null;
  };

  $.fn.clndr = function(options) {
    if(this.length === 1) {
      if(!this.data('plugin_clndr')) {
        var clndr_instance = new Clndr(this, options);
        this.data('plugin_clndr', clndr_instance);
        return clndr_instance;
      }
      return this.data('plugin_clndr');
    } else if(this.length > 1) {
      throw new Error("CLNDR does not support multiple elements yet. Make sure your clndr selector returns only one element.");
    }
  };

}));
