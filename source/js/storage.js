function loadFromStorage() {
  if (localStorage["use_sync"] == "no") { return; }

  chrome.storage.sync.get(null, function(items) {
    for (var key in items) {
      localStorage[key] = items[key]; 
    }
  });
}

var syncRetryTimeout;

function saveToStorage(callback) {
  if (localStorage["use_sync"] == "no") { return; }

  if (syncRetryTimeout) {
    console.log("Already waiting for a sync attempt, throttling request");
    if (callback) { callback(false); }
    return;
  }
  
  var data = {};
  for (var key in localStorage) { 
    data[key] = localStorage[key];
  }

  chrome.storage.sync.set(data, retryOnError(saveToStorage, callback));
}

// callback (optional function) will be called with true/false depending on success of the attempt (once)
function retryOnError(retryFunction, callback) {
  return function() {
    if (chrome.runtime.lastError) {
      console.warn("Will retry in a minute due to ", chrome.runtime.lastError.message);
      if (callback) { callback(false); }
      
      syncRetryTimeout = window.setTimeout(function() {
        syncRetryTimeout = null;
        retryFunction();
      }, 60*1000);
      
    } else {
      if (callback) { callback(true); }
    }
  }
}

function onStorageChange(changes, area) {
  if (area != "sync") { return; }
  
  if (localStorage["use_sync"] == "no") { return; }
  
  for (var key in changes) {
    if (typeof changes[key].newValue === "undefined") { // Key deleted
      //delete localStorage[key];
    } else {
      localStorage[key] = changes[key].newValue;

      // Quick & Dirty listener for context menu option changes for toggling state
      if(key == 'context_menu') {
        toggleContentMenus(localStorage[key]);
      }
    }
  }

  chrome.runtime.sendMessage({'update': true});
}