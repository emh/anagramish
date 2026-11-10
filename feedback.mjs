import {api} from './api-client.mjs';
import {APP_VERSION} from './app-version.mjs';

export function setupFeedback({context,onOpen,onClose}) {
 const panel=document.getElementById('feedback-panel'),form=panel.querySelector('form');
 const comment=form.elements.comment,status=document.getElementById('feedback-status'),send=form.querySelector('[type=submit]');
 let draft=null,opener=null,sending=false,saved=false;
 function close() {
  if(sending)return;
  panel.hidden=true;document.body.classList.remove('feedback-open');const target=onClose();
  if(target){target.tabIndex=-1;target.focus();}
  else if(opener?.isConnected)opener.focus();else document.getElementById('feedback-button').focus();
 }
 function open(entry='header',rating=null) {
  if(!panel.hidden){close();return;}
  opener=document.activeElement;
  const current=context();
  // Retain an unsent draft for this screen/game, including the same retry ID.
  const signature=JSON.stringify(current);
  if(!draft||saved||draft.signature!==signature) {
   form.reset();draft={id:crypto.randomUUID(),signature,...current,entry,appVersion:APP_VERSION};saved=false;
  }
  if(rating)form.elements.rating.value=rating;
  document.getElementById('feedback-rating').hidden=!current.sessionId;
  panel.querySelector('fieldset').disabled=!current.sessionId;
  if(draft.pendingPayload){comment.value=draft.pendingPayload.comment;form.elements.rating.value=draft.pendingPayload.rating??'';panel.querySelector('fieldset').disabled=true;}
  send.disabled=false;send.textContent=draft.pendingPayload?'Try again':'Send feedback';comment.disabled=!!draft.pendingPayload;
  status.textContent='';panel.hidden=false;document.body.classList.add('feedback-open');onOpen();
  if(draft.pendingPayload)send.focus();else comment.focus();
 }
 document.getElementById('feedback-button').onclick=()=>open();
 document.getElementById('feedback-close').onclick=close;
 document.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Escape'){e.preventDefault();close();}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(sending||saved)return;
  const rating=draft.pendingPayload?.rating??(panel.querySelector('fieldset').disabled?null:form.elements.rating.value||null);
  if(!rating&&!comment.value.trim()){status.textContent='Choose a rating or write a comment.';comment.focus();return;}
  sending=true;send.disabled=true;comment.disabled=true;panel.querySelector('fieldset').disabled=true;send.textContent='Sending…';status.textContent='';
  document.getElementById('feedback-close').disabled=true;
  const {signature,pendingPayload,...payload}=draft;
  draft.pendingPayload=pendingPayload??{...payload,rating,comment:comment.value};
  try {
   await api('/api/feedback',draft.pendingPayload);
   saved=true;status.textContent='Thank you! Your feedback has been sent.';send.textContent='Sent';comment.disabled=true;panel.querySelector('fieldset').disabled=true;
  } catch(error) {if(error.status>=400&&error.status<500)draft.pendingPayload=null;status.textContent=draft.pendingPayload?'Could not confirm delivery. Try again to confirm your feedback was saved.':error.message;send.disabled=false;send.textContent='Try again';}
  finally {sending=false;document.getElementById('feedback-close').disabled=false;if(saved)document.getElementById('feedback-close').focus();else{comment.disabled=!!draft.pendingPayload;panel.querySelector('fieldset').disabled=!!draft.pendingPayload||!draft.sessionId;}}
 });
 return {open,isOpen:()=>!panel.hidden};
}
