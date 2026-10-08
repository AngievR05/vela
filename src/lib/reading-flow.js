import { z } from "zod";
import { localDate } from "./reading-calendar.js";
export const finishChoices=["Characters","World-building","Romance","Mystery","Writing style","Atmosphere","Humour","Themes","Fast pacing","Slow pacing","Emotional depth","Found family"];
export const dnfChoices=["Pacing too slow","Did not connect","Writing style","Not in the mood","Too confusing","Lost interest"];
export const validReadingDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;
const day=z.string().refine(validReadingDate,"Choose a valid date.").nullable();
const base={id:z.uuid(),operationId:z.uuid(),expectedUpdatedAt:z.iso.datetime({offset:true})};
const tags=choices=>z.array(z.enum(choices)).max(choices.length).refine(a=>new Set(a).size===a.length,"Choose each option once.");
export const readingFlowMutations=[
 z.object({...base,kind:z.literal("finish"),startedAt:day,finishedAt:day.refine(Boolean,"Choose an end date."),rating:z.number().int().min(1).max(5).nullable(),notes:z.string().max(2000),feedback:tags(finishChoices),useForLearning:z.boolean()}).strict(),
 z.object({...base,kind:z.literal("dnf"),startedAt:day,stoppedAt:day.refine(Boolean,"Choose an end date."),reasons:tags(dnfChoices),privateReason:z.string().max(300),useForLearning:z.boolean()}).strict(),
 z.object({...base,kind:z.literal("reading_dates"),startedAt:day,finishedAt:day,stoppedAt:day}).strict(),
 z.object({...base,kind:z.literal("restore_reading")}).strict(),
 z.object({...base,kind:z.literal("undo_reading"),updateId:z.uuid()}).strict(),
];
export function checkReadingDates(start,end,today=localDate()){
 if((start&&!validReadingDate(start))||(end&&!validReadingDate(end)))return "Choose valid start and end dates.";
 if((start&&start>today)||(end&&end>today))return "Reading dates cannot be in the future.";
 if(start&&end&&end<start)return "The end date must be on or after the start date.";
 return "";
}
export function progressValue(value,mode,pageCount){
 const number=Number(value),limit=mode==="page"?pageCount:100;
 if(!String(value).trim()||!Number.isInteger(number)||number<0||!limit||number>limit)throw new Error(`Enter a whole number from 0 to ${limit||100}. Your entry is still here.`);
 return {percent:mode==="page"?number===pageCount?100:Math.min(99,Math.round(number*100/pageCount)):number,...(mode==="page"?{page:number}:{})};
}
