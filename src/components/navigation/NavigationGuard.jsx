"use client";
import {createContext,useContext,useEffect} from "react";

export const NavigationGuardContext=createContext(null);

// Each open dialog/save owns its guard and releases it on close or unmount.
export function useNavigationGuard(blocked){
  const register=useContext(NavigationGuardContext);
  useEffect(()=>{
    if(blocked&&register)return register();
  },[blocked,register]);
}
