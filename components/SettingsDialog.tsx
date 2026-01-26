"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save } from "lucide-react";

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (isOpen) {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
            const data = JSON.parse(saved);
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
            setAge(data.age || "");
        }
    }
  }, [isOpen]);

  const handleSave = () => {
    const profile = { firstName, lastName, age };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    onClose();
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="text-emerald-500" size={20}/> Mon Profil
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Modifiez vos informations personnelles ici.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstname" className="text-right text-zinc-400">Prénom</Label>
            <Input id="firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3 bg-zinc-900 border-zinc-800" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastname" className="text-right text-zinc-400">Nom</Label>
            <Input id="lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3 bg-zinc-900 border-zinc-800" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right text-zinc-400">Âge</Label>
            <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} className="col-span-3 bg-zinc-900 border-zinc-800" />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}