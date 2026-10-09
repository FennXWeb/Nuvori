import type {WorldObject} from '../worldContent';
export interface Asset {name:string;group:string;prop:Omit<WorldObject,'x'|'y'|'id'>}
const asset=(name:string,group:string,kind:number,size=100,solid=true,interact?:WorldObject['interact']):Asset=>({name,group,prop:{kind,size,solid,...(interact?{interact,label:name}:{})}});
export const ASSETS:Asset[]=[
 asset('Healing lodge','Services',5,142,true,'heal'),asset('Supply shop','Services',6,132,true,'shop'),asset('Nuvo nursery','Services',4,125,true,'nursery'),asset('Clothing store','Services',4,128,true,'tailor'),asset('Barber shop','Services',4,126,true,'barber'),asset('Champions hall','Services',7,140,true,'league'),
 asset('Oak tree','Nature',0),asset('Evergreen','Nature',1),asset('Amber tree','Nature',2),asset('Mushroom tree','Nature',3),asset('Crystal cluster','Nature',8,72),asset('Ancient stone','Nature',9,110),asset('Boulder','Nature',12,45),asset('Flower patch','Nature',13,44,false),
 ...['Cottage','Timber house','Garden home','Townhouse'].map((n,i)=>asset(n,'Buildings',30+i,146)),
 ...['Manor','Windmill house','Market hall','Observatory','Bakery','Library','Clock tower','Workshop'].map((n,i)=>asset(n,'Buildings',50+i,146)),
 asset('Fountain','Decor',11,175),asset('Bench','Decor',40,60),asset('Lantern','Decor',41,56,false),
 ...['Market cart','Flower stall','Notice board','Archway','Planter','Well','Crates','Garden pavilion','Signpost','Barrels','Statue','Bunting'].map((n,i)=>asset(n,'Decor',60+i,i===7?108:72,i!==4)),
 asset('Ranger Elowen','People',-1,58,false,'professor'),asset('Trail guide','People',14,45,false,'sign'),
 ...['Bed','Counter','Shelf','Fireplace','Clothing rack','Salon chair','Nursery cradle'].map((n,i)=>asset(n,'Furniture',20+i,76)),
 asset('Room exit','Furniture',-2,28,false,'exit'),
];
export const objectName=(p:WorldObject)=>p.label??ASSETS.find(a=>a.prop.kind===p.kind)?.name??'World object';
