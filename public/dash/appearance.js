/* Dashboard appearance is a browser preference, never website content. */
(function(){
  'use strict';
  var root=document.documentElement,key='sane-dashboard-appearance',preference='system';
  var system=window.matchMedia('(prefers-color-scheme: dark)');
  try{var saved=localStorage.getItem(key);if(['light','dark','system'].includes(saved))preference=saved;}catch(e){}
  function apply(){
    var theme=preference==='system'?(system.matches?'dark':'light'):preference;
    root.dataset.dashboardTheme=theme;root.dataset.dashboardAppearance=preference;root.style.colorScheme=theme;
    document.querySelectorAll('[data-dashboard-appearance]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.dashboardAppearance===preference));});
  }
  function select(value){preference=value;try{localStorage.setItem(key,value);}catch(e){}apply();}
  apply();
  if(system.addEventListener)system.addEventListener('change',function(){if(preference==='system')apply();});
  window.addEventListener('storage',function(event){if(event.key===key){preference=['light','dark','system'].includes(event.newValue)?event.newValue:'system';apply();}});
  document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('[data-dashboard-appearance]').forEach(function(button){button.addEventListener('click',function(){select(button.dataset.dashboardAppearance);});});apply();});
})();
