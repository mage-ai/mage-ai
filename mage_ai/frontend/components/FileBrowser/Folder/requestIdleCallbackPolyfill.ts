// @ts-nocheck
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    window.idleCallbackShim = factory();
  }
}(function(){
  'use strict';
  var scheduleStart, throttleDelay, lazytimer, lazyraf;
  var root = typeof window != 'undefined' ?
    window :
    typeof global != undefined ?
      global :
      this || {};
  var requestAnimationFrame = root.cancelRequestAnimationFrame && root.requestAnimationFrame || setTimeout;
  var cancelRequestAnimationFrame = root.cancelRequestAnimationFrame || clearTimeout;
  var tasks = [];
  var runAttempts = 0;
  var isRunning = false;
  var remainingTime = 7;
  var minThrottle = 35;
  var throttle = 125;
  var index = 0;
  var taskStart = 0;
  var tasklength = 0;
  var IdleDeadline = {
    get didTimeout(){
      return false;
    },
    timeRemaining: function(){
      var timeRemaining = remainingTime - (Date.now() - taskStart);
      return Math.max(0, timeRemaining)
    },
  };
  var setInactive = debounce(function(){
    remainingTime = 22;
    throttle = 66;
    minThrottle = 0;
  });

  function debounce(fn){
    var id, timestamp;
    var wait = 99;
    var check = function(){
      var last = (Date.now()) - timestamp;

      if (last < wait) {
        id = setTimeout(check, wait - last);
      } else {
        id = null;
        fn();
      }
    };
    return function(){
      timestamp = Date.now();
      if(!id){
        id = setTimeout(check, wait);
      }
    };
  }

  function abortRunning(){
    if(isRunning){
      if(lazyraf){
        cancelRequestAnimationFrame(lazyraf);
      }
      if(lazytimer){
        clearTimeout(lazytimer);
      }
      isRunning = false;
    }
  }

  function onInputorMutation(){
    if(throttle != 125){
      remainingTime = 7;
      throttle = 125;
      minThrottle = 35;

      if(isRunning) {
        abortRunning();
        scheduleLazy();
      }
    }
    setInactive();
  }

  function scheduleAfterRaf() {
    lazyraf = null;
    lazytimer = setTimeout(runTasks, 0);
  }

  function scheduleRaf(){
    lazytimer = null;
    requestAnimationFrame(scheduleAfterRaf);
  }

  function scheduleLazy(){

    if(isRunning){return;}
    throttleDelay = throttle - (Date.now() - taskStart);

    scheduleStart = Date.now();

    isRunning = true;

    if(minThrottle && throttleDelay < minThrottle){
      throttleDelay = minThrottle;
    }

    if(throttleDelay > 9){
      lazytimer = setTimeout(scheduleRaf, throttleDelay);
    } else {
      throttleDelay = 0;
      scheduleRaf();
    }
  }

  function runTasks(){
    var task, i, len;
    var timeThreshold = remainingTime > 9 ?
      9 :
      1
    ;

    taskStart = Date.now();
    isRunning = false;

    lazytimer = null;

    if(runAttempts > 2 || taskStart - throttleDelay - 50 < scheduleStart){
      for(i = 0, len = tasks.length; i < len && IdleDeadline.timeRemaining() > timeThreshold; i++){
        task = tasks.shift();
        tasklength++;
        if(task){
          task(IdleDeadline);
        }
      }
    }

    if(tasks.length){
      scheduleLazy();
    } else {
      runAttempts = 0;
    }
  }

  function requestIdleCallbackShim(task){
    index++;
    tasks.push(task);
    scheduleLazy();
    return index;
  }

  function cancelIdleCallbackShim(id){
    var index = id - 1 - tasklength;
    if(tasks[index]){
      tasks[index] = null;
    }
  }

  if(!root.requestIdleCallback || !root.cancelIdleCallback){
    root.requestIdleCallback = requestIdleCallbackShim;
    root.cancelIdleCallback = cancelIdleCallbackShim;

    if(root.document && document.addEventListener){
      root.addEventListener('scroll', onInputorMutation, true);
      root.addEventListener('resize', onInputorMutation);

      document.addEventListener('focus', onInputorMutation, true);
      document.addEventListener('mouseover', onInputorMutation, true);
      ['click', 'keypress', 'touchstart', 'mousedown'].forEach(function(name){
        document.addEventListener(name, onInputorMutation, {capture: true, passive: true});
      });

      if(root.MutationObserver){
        new MutationObserver( onInputorMutation ).observe( document.documentElement, {childList: true, subtree: true, attributes: true} );
      }
    }
  } else {
    try{
      root.requestIdleCallback(function(){}, {timeout: 0});
    } catch(e){
      (function(rIC){
        var timeRemainingProto, timeRemaining;
        root.requestIdleCallback = function(fn, timeout){
          if(timeout && typeof timeout.timeout == 'number'){
            return rIC(fn, timeout.timeout);
          }
          return rIC(fn);
        };
        if(root.IdleCallbackDeadline && (timeRemainingProto = IdleCallbackDeadline.prototype)){
          timeRemaining = Object.getOwnPropertyDescriptor(timeRemainingProto, 'timeRemaining');
          if(!timeRemaining || !timeRemaining.configurable || !timeRemaining.get){return;}
          Object.defineProperty(timeRemainingProto, 'timeRemaining', {
            value:  function(){
              return timeRemaining.get.call(this);
            },
            enumerable: true,
            configurable: true,
          });
        }
      })(root.requestIdleCallback)
    }
  }

  return {
    request: requestIdleCallbackShim,
    cancel: cancelIdleCallbackShim,
  };
}));

export default {};
