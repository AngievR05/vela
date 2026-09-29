"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import RadioOption from "@/components/ui/RadioOption";
import styles from "@/components/design-system/DesignSystem.module.css";

const OPTIONS=[
  {value:"keep",label:"Keep this",supportingText:"Keep using this signal at its current importance."},
  {value:"reduce",label:"Reduce importance",supportingText:"This signal will have less influence on future suggestions."},
  {value:"remove",label:"Remove",supportingText:"Removed signals will stop influencing future suggestions.",destructive:true},
];

export default function ReadingDNACorrectionControl({ initialValue="keep", onSave, saving=false }) {
  const [value,setValue]=useState(initialValue);
  return (
    <fieldset className={styles.stack}>
      <legend className={styles.h3}>How should Vela use this signal?</legend>
      <div className={styles.radioGroup}>
        {OPTIONS.map(option=>(
          <RadioOption key={option.value} id={`dna-correction-${option.value}`} name="dna-correction"
            value={option.value} label={option.label} supportingText={option.supportingText}
            checked={value===option.value} onChange={()=>setValue(option.value)}
            destructive={option.destructive} disabled={saving}/>
        ))}
      </div>
      <Button onClick={()=>onSave?.(value)} loading={saving} disabled={saving}>Save change</Button>
    </fieldset>
  );
}
