import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { interval, Subscription } from 'rxjs';

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit, OnDestroy {
 api=inject(ApiService); logoAvailable=true;
 profileMenuOpen=false;
 private liveUpdates?:Subscription;
 page='catalog'; user:any=null; token=localStorage.getItem('library_token');
 identifier='';password='';authMode:'login'|'register'='login';registerForm:any={};loading=false;error='';success='';
 catalog:any[]=[];selected:any=null;search='';bookForm:any={collection_type:'General',inside_use_only:false};copyForm:any={};
 reservations:any[]=[];loans:any[]=[];users:any[]=[];notifications:any[]=[];incidents:any[]=[];research:any[]=[];audit:any[]=[];
 unreadNotifications=0;
 extensionRequests:any[]=[];extensionDays:Record<number,number>={};
 checkoutForm:any={};checkoutSelection:number|null=null;userForm:any={role:'student',patron_type:'Student'};researchForm:any={public:false};incidentForm:any={type:'Lost'};
 settings:any={};dashboard:any={};report:any={};start='';end='';file:File|null=null;csv:File|null=null;
 statusOptions=['Pending','Approved','Rejected','Ready for Pickup','Completed','Cancelled','Expired'];
 get isStaff(){return this.user?.role==='admin'||this.user?.role==='librarian';}
 get isAdmin(){return this.user?.role==='admin';}
 get userInitials(){const name=String(this.user?.name||'').trim();return name.split(/\s+/).filter(Boolean).slice(0,2).map((part:string)=>part.charAt(0)).join('').toUpperCase()||'?';}
 get checkoutRequests(){return this.reservations.filter(r=>['Approved','Ready for Pickup'].includes(r.status)&&r.accession_number);}
 get selectedCheckoutRequest(){return this.checkoutRequests.find(r=>r.id===this.checkoutSelection)||null;}
 ngOnInit(){if(this.token)this.api.get('/me').subscribe({next:u=>{this.user=u;this.refresh();},error:()=>this.logout(false)});else this.refresh();this.liveUpdates=interval(5000).subscribe(()=>{if(!document.hidden&&!this.loading)this.refreshCurrentPage();});}
 ngOnDestroy(){this.liveUpdates?.unsubscribe();}
 @HostListener('document:click') closeProfileMenu(){this.profileMenuOpen=false;}
 @HostListener('document:keydown.escape') closeProfileMenuOnEscape(){this.profileMenuOpen=false;}
 goHome(){this.navigate(this.user?'dashboard':'catalog');}
 openSignIn(){this.navigate('login');this.authMode='login';}
 openRegistration(){this.navigate('login');this.authMode='register';}
 notice(error:any){this.error=error?.error?.message||error?.message||'Something went wrong. Check the server.';this.success='';this.loading=false;}
 ok(msg:string){this.success=msg;this.error='';this.loading=false;}
 run(req:any,msg:string,after?:()=>void){this.loading=true;this.error='';req.subscribe({next:()=>{this.ok(msg);(after??(()=>this.refresh()))();},error:(e:any)=>this.notice(e)});}
 login(){
  this.loading=true;this.error='';this.success='';
  this.api.post('/login',{identifier:this.identifier,password:this.password}).subscribe({
   next:(v:any)=>{
    localStorage.setItem('library_token',v.token);this.token=v.token;this.password='';
    this.flyLoginLogo(()=>{this.user=v.user;this.page='dashboard';this.ok('Signed in');this.refresh();});
   },
   error:(e:any)=>this.notice(e)
  });
 }
 private flyLoginLogo(after:()=>void){
  const source=document.querySelector('.auth-seal img') as HTMLImageElement|null;
  const target=document.querySelector('.brand-mark img') as HTMLImageElement|null;
  if(!source||!target||window.matchMedia('(prefers-reduced-motion: reduce)').matches){after();return;}
  const start=source.getBoundingClientRect();const end=target.getBoundingClientRect();
  if(start.width===0||start.height===0||end.width===0||end.height===0){after();return;}
  const flight=document.createElement('img');flight.className='login-logo-flight';flight.alt='';flight.src=source.currentSrc||source.src;
  Object.assign(flight.style,{left:`${start.left}px`,top:`${start.top}px`,width:`${start.width}px`,height:`${start.height}px`,transform:'rotate(0deg) scale(1)',transition:'none'});
  document.body.appendChild(flight);document.body.classList.add('logo-flight-active');
  let finished=false;
  const finish=()=>{
   if(finished)return;finished=true;after();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{flight.remove();document.body.classList.remove('logo-flight-active');}));
  };
  flight.addEventListener('transitionend',(event:TransitionEvent)=>{if(event.propertyName==='transform')finish();});
  window.setTimeout(finish,1050);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   flight.style.transition='left 920ms ease-in-out,top 920ms ease-in-out,width 920ms ease-in-out,height 920ms ease-in-out,transform 920ms ease-in-out';
   flight.style.left=`${end.left}px`;flight.style.top=`${end.top}px`;flight.style.width=`${end.width}px`;flight.style.height=`${end.height}px`;flight.style.transform='rotate(360deg) scale(.94)';
  }));
 }
 registerStudent(){this.loading=true;this.error='';this.success='';this.api.post('/register',this.registerForm).subscribe({next:(v:any)=>{localStorage.setItem('library_token',v.token);this.token=v.token;this.user=v.user;this.registerForm={};this.page='dashboard';this.ok('Student account created');this.refresh();},error:e=>this.notice(e)});}
 logout(call=true){this.profileMenuOpen=false;if(call&&this.token)this.api.post('/logout',{}).subscribe();localStorage.removeItem('library_token');this.user=null;this.token=null;this.notifications=[];this.unreadNotifications=0;this.page='catalog';this.loadCatalog();}
 navigate(p:string){this.profileMenuOpen=false;this.page=p;this.selected=null;if(p==='login')this.authMode='login';this.error='';this.success='';this.refresh();}
 refresh(){this.refreshCurrentPage();}
 private refreshCurrentPage(){
  if(this.page==='catalog')this.loadCatalog();
  if(this.page==='research')this.loadResearch();
  if(!this.user)return;
  this.loadNotifications();
  if(this.page==='dashboard')this.api.get('/dashboard').subscribe({next:x=>this.dashboard=x,error:e=>this.notice(e)});
  if(this.page==='my-loans'&&!this.isStaff){this.api.get('/my-loans').subscribe(x=>this.setLoans(x));this.loadMyLoanExtensions();}
  if(this.page==='my-reservations'&&!this.isStaff)this.api.get('/my-reservations').subscribe(x=>this.reservations=x);
  if(this.isStaff){
    if(this.page==='reservations'||this.page==='loans')this.api.get('/reservations').subscribe(x=>this.reservations=x.data);
    if(this.page==='loans')this.api.get('/loans').subscribe(x=>this.setLoans(x.data));
    if(this.page==='loans')this.api.get('/extension-requests').subscribe(x=>this.extensionRequests=x.data);
    if(this.page==='users')this.api.get('/users').subscribe(x=>this.users=x.data);
    if(this.page==='incidents')this.api.get('/incidents').subscribe(x=>this.incidents=x.data);
    if(this.page==='reports')this.getReport();
  }
  if(this.isAdmin){if(this.page==='settings')this.api.get('/settings').subscribe(x=>this.settings=x);if(this.page==='audit')this.api.get('/audit-logs').subscribe(x=>this.audit=x.data);}
 }
 loadCatalog(){this.api.get('/catalog',{search:this.search}).subscribe({next:v=>this.catalog=v.data,error:e=>this.notice(e)});}
 details(id:number){this.api.get('/catalog/'+id).subscribe({next:v=>this.selected=v,error:e=>this.notice(e)});}
 editBook(b:any){this.bookForm={...b,inside_use_only:!!b.inside_use_only};this.navigate('books');}
 saveBook(){const data={...this.bookForm};const id=data.id;delete data.id;delete data.created_at;delete data.updated_at;delete data.available_copies;delete data.total_copies;delete data.copies;
  this.run(id?this.api.put('/books/'+id,data):this.api.post('/books',data),'Book saved',()=>{this.bookForm={collection_type:'General',inside_use_only:false};this.loadCatalog();});}
 addCopy(){this.run(this.api.post('/books/'+this.copyForm.book_id+'/copies',{accession_number:this.copyForm.accession_number,condition:this.copyForm.condition||'Good'}),'Copy added',()=>{this.copyForm={};this.loadCatalog();});}
 reserve(book:any){this.run(this.api.post('/reservations',{book_id:book.id}),'Reservation request sent',()=>{this.selected=null;this.navigate('my-reservations');});}
 changeReservation(r:any,status:string){const reason=status==='Rejected'?(prompt('Reason for rejection:')??''):'';this.run(this.api.post(`/reservations/${r.id}/status`,{status,reason}),`Reservation ${status}`,()=>this.refresh());}
 cancelReservation(r:any){if(confirm('Cancel reservation?'))this.run(this.api.post(`/reservations/${r.id}/cancel`,{}),'Reservation cancelled');}
 selectCheckoutRequest(id:number|null){this.checkoutSelection=id;const request=this.checkoutRequests.find(r=>r.id===id);this.checkoutForm=request?{student_id:request.student_id,accession_number:request.accession_number,due_date:''}:{};}
 checkout(){this.run(this.api.post('/loans/checkout',this.checkoutForm),'Borrowing confirmed',()=>{this.checkoutForm={};this.checkoutSelection=null;this.refresh();});}
 extensionForLoan(loanId:number){return this.extensionRequests.find(r=>r.loan_id===loanId&&['Pending','Approved'].includes(r.status))||null;}
 private setLoans(items:any[]){this.loans=items;for(const loan of items)this.extensionDays[loan.id]??=3;}
 requestLoanExtension(loan:any){const days=Number(this.extensionDays[loan.id]||3);this.run(this.api.post(`/loans/${loan.id}/extension-requests`,{requested_days:days}),`Extension request sent for ${days} days`);}
 decideLoanExtension(request:any,status:'Approved'|'Rejected'){this.run(this.api.post(`/extension-requests/${request.id}/decision`,{status}),`Extension request ${status.toLowerCase()}`);}
 returnLoan(l:any){const condition=prompt('Book condition: Good, Fair, Poor, or Damaged','Good');if(condition===null)return;
  this.run(this.api.post(`/loans/${l.id}/return`,{condition}),'Book checked in');}
 renewLoan(l:any){const due_date=prompt('New due date (YYYY-MM-DD)',l.due_date);if(!due_date)return;this.run(this.api.post(`/loans/${l.id}/renew`,{due_date}),'Loan renewed');}
 saveUser(){this.run(this.api.post('/users',this.userForm),'User created',()=>{this.userForm={role:'student',patron_type:'Student'};this.refresh();});}
 importCSV(){if(!this.csv)return;const f=new FormData();f.append('file',this.csv);this.loading=true;this.api.post('/users/import',f).subscribe({next:v=>{this.ok(`Imported ${v.imported} students. ${v.errors.length} skipped.`);this.refresh();},error:e=>this.notice(e)});}
 saveIncident(){this.run(this.api.post('/incidents',this.incidentForm),'Incident recorded',()=>{this.incidentForm={type:'Lost'};this.refresh();});}
 loadResearch(){this.api.get('/research').subscribe(x=>this.research=x.data);}
 loadNotifications(){this.api.get('/notifications').subscribe({next:(items:any[])=>{this.notifications=items;this.unreadNotifications=items.filter(n=>!n.read_at).length;},error:e=>this.notice(e)});}
 loadMyLoanExtensions(){this.api.get('/my-loan-extensions').subscribe(x=>this.extensionRequests=x);}
 uploadResearch(){if(!this.file)return;const d=new FormData();for(const [k,v] of Object.entries(this.researchForm))if(v!==null&&v!==undefined)d.append(k,k==='public'?(v?'1':'0'):String(v));d.append('file',this.file);this.run(this.api.post('/research',d),'Research document uploaded',()=>{this.researchForm={public:false};this.file=null;this.loadResearch();});}
 downloadResearch(d:any){this.api.download(`/research/${d.id}/download`).subscribe({next:blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=d.title.replace(/[^a-z0-9 -]/gi,'')+'.pdf';a.click();URL.revokeObjectURL(url);},error:e=>this.notice(e)});}
 getReport(){this.api.get('/reports',{...(this.start?{start:this.start}:{}),...(this.end?{end:this.end}:{})}).subscribe({next:v=>this.report=v,error:e=>this.notice(e)});}
 saveSettings(){this.run(this.api.put('/settings',this.settings),'Settings saved');}
 markRead(){this.api.post('/notifications/read',{}).subscribe({next:()=>{const readAt=new Date().toISOString();this.notifications=this.notifications.map(n=>({...n,read_at:n.read_at||readAt}));this.unreadNotifications=0;this.ok('Notifications marked read');},error:e=>this.notice(e)});}
 exportCSV(){const rows=[['Book','Times Borrowed'],...(this.report.top_books||[]).map((b:any)=>[b.title,b.times_borrowed])];const csv=rows.map((r:any[])=>r.map((c:any)=>'"'+String(c).replaceAll('"','""')+'"').join(',')).join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download='top-books.csv';link.click();URL.revokeObjectURL(link.href);}
}
