import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
export const API_URL = 'http://127.0.0.1:8000/api';
export const tokenInterceptor: HttpInterceptorFn = (request,next) => {
  const token = localStorage.getItem('library_token');
  return next(token?request.clone({setHeaders:{Authorization:`Bearer ${token}`}}):request);
};
@Injectable({providedIn:'root'})
export class ApiService {
  private http=inject(HttpClient);
  get(path:string,params?:Record<string,string>):Observable<any>{return this.http.get<any>(`${API_URL}${path}`,{params});}
  post(path:string,data:object|FormData):Observable<any>{return this.http.post<any>(`${API_URL}${path}`,data);}
  put(path:string,data:object):Observable<any>{return this.http.put<any>(`${API_URL}${path}`,data);}
  download(path:string):Observable<Blob>{return this.http.get(`${API_URL}${path}`,{responseType:'blob'});}
}
