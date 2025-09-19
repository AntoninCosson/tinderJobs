"use client";
import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";



import CvA4Page from "./CvA4Page";

function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj || {}));
}

export default function ManualChanges({ offer, newOffer, setNewOffer, onValidate }) {

  const [openPersonal, setOpenPersonal] = useState(false);

  const [langRemoveMode, setLangRemoveMode] = useState(false);
  const [langRemoveSel, setLangRemoveSel] = useState(new Set());

  const [openDiplomas, setOpenDiplomas] = useState(false);
  const [openDiplomaKeys, setOpenDiplomaKeys] = useState({});
  const [diplomaRemoveMode, setDiplomaRemoveMode] = useState(false);
  const [diplomaRemoveSel, setDiplomaRemoveSel] = useState(new Set());

  const [openSkills, setOpenSkills] = useState(false);
  const [openSkillKeys, setOpenSkillKeys] = useState({});
  const [skillsRemoveMode, setSkillsRemoveMode] = useState(false);
  const [skillsRemoveSel, setSkillsRemoveSel] = useState({});

  const [openExperiences, setOpenExperiences] = useState(false);
  const [openXpKeys, setOpenXpKeys] = useState({});
  const [openXpTaskKeys, setOpenXpTaskKeys] = useState({});
  const [xpRemoveMode, setXpRemoveMode] = useState(false);
  const [xpRemoveSel, setXpRemoveSel] = useState(new Set());

  
  const [editor, setEditor] = useState(null);
      // editor: type === "xPTasks" ?
      
  const [showCv, setShowCv] = useState(false);

  const label = (v) => (v ?? "").toString().trim() || "—";
  const stop = (e) => e.stopPropagation();
  const toId = (s = "") => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const cv = newOffer?.cvInfos?.[0] ?? {};
  const personal = cv.personal_info ?? {};
  const languages = Array.isArray(personal.languages) ? personal.languages : [];
  const diplomas = Array.isArray(cv.diplomas) ? cv.diplomas : [];
  const skills = cv.skills ?? {};
  const experiences = Array.isArray(cv.experiences) ? cv.experiences : [];

  function seedLanguagesFromFallback() {
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      cv0.personal_info = cv0.personal_info || {};
  
      if (Array.isArray(cv0.personal_info.languages) && cv0.personal_info.languages.length > 0) {
        return next;
      }
  
      const seed = [];
      if (cv0.personal_info.anglais)  seed.push({ name: "anglais",  level: String(cv0.personal_info.anglais) });
      if (cv0.personal_info.japonais) seed.push({ name: "japonais", level: String(cv0.personal_info.japonais) });
  
      if (seed.length === 0) return next;
  
      cv0.personal_info.languages = seed;
  
      delete cv0.personal_info.anglais;
      delete cv0.personal_info.japonais;
  
      return next;
    });
  }

  function isGroupFullySelected(groupKey, list) {
    const set = skillsRemoveSel[groupKey];
    return set && set.size >= list.length && list.length > 0;
  }

  // Toggles
  const toggleSkill = (k) =>
    setOpenSkillKeys((prev) => ({ ...prev, [k]: !prev[k] }));
  const toggleXp = (key) =>
    setOpenXpKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleXpTasks = (key) =>
    setOpenXpTaskKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleDiploma = (key) =>
    setOpenDiplomaKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  function toggleLanguageRemovalSelection(idx) {
    setLangRemoveSel(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function toggleDiplomaRemovalSelection(idx) {
    setDiplomaRemoveSel(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleSkillRemovalSelection(groupKey, idx) {
    setSkillsRemoveSel(prev => {
      const next = { ...prev };
      const set = new Set(next[groupKey] || []);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      next[groupKey] = set;
      return next;
    });
  }

  function toggleGroupRemovalSelection(groupKey, list) {
    setSkillsRemoveSel(prev => {
      const next = { ...prev };
      const all = new Set(list.map((_, i) => i));
      const cur = new Set(next[groupKey] || []);
      next[groupKey] = (cur.size === all.size) ? new Set() : all;
      return next;
    });
  }

  function toggleXpRemovalSelection(idxReal) {
    setXpRemoveSel(prev => {
      const next = new Set(prev);
      if (next.has(idxReal)) next.delete(idxReal);
      else next.add(idxReal);
      return next;
    });
  }



  // Open editors
  function openStatusEditor(value) {
    setEditor({
      type: "status",
      value: value || "",
      title: "Modifier Status",
      placeholder: "Nouveau status…",
    });
  }

  function openStatusSpeEditor(value) {
    setEditor({
      type: "statusSpe",
      value: value || "",
      title: "Modifier StatusSpé",
      placeholder: "Nouveau statusSpé…",
    });
  }

  function openLangAdder() {
    setEditor({
          type: "lang",
          idx: null,
          title: "Ajouter une langue",
          value: { name: "", level: "" },
        });
  }
  
  function openLangEditor(idx, val) {
      setEditor({
          type: "lang",
          idx,
          title: `Modifier la langue #${idx + 1}`,
          value: { name: val?.name ?? "", level: val?.level ?? "" },
        });
  }

  function openDiplomaEditor(d, idx) {
    setEditor({
      type: "diploma",
      idx,
      title: `Modifier diplôme #${idx + 1}`,
      titleDiploma: d?.titleDiploma || "",
      school: d?.school || "",
      locationSchool: d?.locationSchool || "",
      datesDiplomas: d?.datesDiplomas || d?.dates || "",
    });
  }
  
  function openDiplomaNew() {
    setEditor({
      type: "diplomaNew",
      idx: null,
      title: "Ajouter un diplôme",
      titleDiploma: "",
      school: "",
      locationSchool: "",
      datesDiplomas: "",
    });
  }

  function openSkillEditor(groupKey, list) {
    setEditor({
      type: "skill",
      key: groupKey,
      newKey: groupKey,
      value: (list || []).join(", "),
      title: `Modifier skills: ${groupKey}`,
      placeholder: "val1, val2, val3",
    });
  }

  function openNewSkillEditor() {
    setEditor({
      type: "skillNew",
      key: "",
      newKey: "",
      value: "",
      title: "Ajouter un groupe de skills",
      placeholder: "val1, val2, val3",
    });
  }

  function openXpEditor(xp, idx) {
    setEditor({
      type: "xp",
      idx,
      title: `Modifier XP #${idx + 1}`,
      titleXP: xp?.titleXP || "",
      dates:   xp?.dates   || "",
    });
  }

  function openXpFullEditor(xp, idx) {
    setEditor({
      type: "xpFull",
      idx,
      title: idx != null ? `Modifier XP #${idx + 1}` : "Ajouter une expérience",
      titleXP: xp?.titleXP || "",
      dates: xp?.dates || "",
      tasks: [...(xp?.tasks || []), ""],
    });
  }

  function openXpTasksEditor(xp, idx) {
    setEditor({
      type: "xpTasks",
      idx,
      title: `Modifier tâches XP #${idx + 1}`,
      tasks: [...(xp?.tasks || []), ""],
    });
  }

  

  // update newOffer

  function updateDiploma(idx, payload) {
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      cv0.diplomas = Array.isArray(cv0.diplomas) ? cv0.diplomas : [];
      cv0.diplomas[idx] = { ...(cv0.diplomas[idx] || {}), ...payload };
      return next;
    });
  }

  function updateXp(idx, payload) {
    setNewOffer((prev) => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      cv0.experiences = Array.isArray(cv0.experiences) ? cv0.experiences : [];
      cv0.experiences[idx] = { ...(cv0.experiences[idx] || {}), ...payload };
      return next;
    });
  }

    function updateXpTasks(idx, input) {
        const arr = Array.isArray(input)
          ? input.map(s => String(s).trim()).filter(Boolean)
          : String(input || "")
              .split("\n")
              .map(s => s.trim())
              .filter(Boolean);
        updateXp(idx, { tasks: arr });
  }



  // confirm Selected
  function confirmRemoveSelectedLanguages() {
    if (!langRemoveMode || langRemoveSel.size === 0) {
      setLangRemoveMode(false);
      setLangRemoveSel(new Set());
      return;
    }
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      cv0.personal_info = cv0.personal_info || {};
      const arr = Array.isArray(cv0.personal_info.languages) ? cv0.personal_info.languages : [];
      cv0.personal_info.languages = arr.filter((_, i) => !langRemoveSel.has(i));
  
      delete cv0.personal_info.anglais;
      delete cv0.personal_info.japonais;
  
      return next;
    });
    setLangRemoveSel(new Set());
    setLangRemoveMode(false);
  }

  function confirmRemoveSelectedSkills() {
    if (!skillsRemoveMode) return;
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      cv0.skills = cv0.skills || {};
      Object.entries(skillsRemoveSel).forEach(([k, set]) => {
        const arr = Array.isArray(cv0.skills[k]) ? cv0.skills[k] : [];
        if (!arr.length || !set || set.size === 0) return;
        const filtered = arr.filter((_, i) => !set.has(i));
        if (filtered.length) cv0.skills[k] = filtered;
        else delete cv0.skills[k];
      });
      return next;
    });
    setSkillsRemoveSel({});
    setSkillsRemoveMode(false);
  }
  
  function confirmRemoveSelectedDiplomas() {
    if (!diplomaRemoveMode || diplomaRemoveSel.size === 0) {
      setDiplomaRemoveMode(false);
      setDiplomaRemoveSel(new Set());
      return;
    }
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      const arr = Array.isArray(cv0.diplomas) ? cv0.diplomas : [];
      cv0.diplomas = arr.filter((_, i) => !diplomaRemoveSel.has(i));
      return next;
    });
    setDiplomaRemoveSel(new Set());
    setDiplomaRemoveMode(false);
  }

  function confirmRemoveSelectedXp() {
    if (!xpRemoveMode || xpRemoveSel.size === 0) {
      setXpRemoveMode(false);
      setXpRemoveSel(new Set());
      return;
    }
    setNewOffer(prev => {
      const next = deepClone(prev);
      const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
      const arr = Array.isArray(cv0.experiences) ? cv0.experiences : [];
      cv0.experiences = arr.filter((_, i) => !xpRemoveSel.has(i));
      return next;
    });
    setXpRemoveSel(new Set());
    setXpRemoveMode(false);
  }
  


  // save editor
  function saveEditor() {
    if (!editor) return;
    try {

      if (editor.type === "lang") {
          const name  = (editor.value?.name  ?? "").trim();
          const level = (editor.value?.level ?? "").trim();
          if (!name) {
            alert("Indique au minimum le nom de la langue (ex: Anglais).");
            return;
          }
          setNewOffer(prev => {
            const next = deepClone(prev);
            const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
            cv0.personal_info = cv0.personal_info || {};
            const arr = Array.isArray(cv0.personal_info.languages) ? [...cv0.personal_info.languages] : [];
       
            const obj = { name, level };
            if (editor.idx == null) {
              arr.push(obj);
            } else if (editor.idx >= 0 && editor.idx < arr.length) {
              arr[editor.idx] = obj;
            }
            cv0.personal_info.languages = arr;
       
            delete cv0.personal_info.anglais;
            delete cv0.personal_info.japonais;
            return next;
          });
        }

      else if (editor.type === "skill") {
        const oldKey = editor.key;
        const newKey = (editor.newKey || oldKey).trim() || oldKey;
      
        const list = (editor.value || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      
        setNewOffer(prev => {
          const next = deepClone(prev);
          const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
          cv0.skills = cv0.skills || {};
      
          if (newKey === oldKey) {
            cv0.skills[oldKey] = list;
          } else {
            const existing = Array.isArray(cv0.skills[newKey]) ? cv0.skills[newKey] : [];
            const merged = Array.from(new Set([ ...existing, ...list ]));
            delete cv0.skills[oldKey];
            cv0.skills[newKey] = merged;
          }
          return next;
        });
      } 
      
      else if (editor.type === "skillNew") {
        const newKey = (editor.newKey || "").trim();
        if (!newKey) {
          alert("Donne un nom de groupe (ex: FRONTEND).");
          return;
        }
      
        const list = (editor.value || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      
        setNewOffer(prev => {
          const next = deepClone(prev);
          const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
          cv0.skills = cv0.skills || {};
      
          if (Array.isArray(cv0.skills[newKey])) {
            const merged = Array.from(new Set([ ...cv0.skills[newKey], ...list ]));
            cv0.skills[newKey] = merged;
          } else {
            cv0.skills[newKey] = list;
          }
          return next;
          });
        }
        
        else if (editor.type === "diploma") {
          const payload = {
            titleDiploma: (editor.titleDiploma ?? "").trim(),
            school: (editor.school ?? "").trim(),
            locationSchool: (editor.locationSchool ?? "").trim(),
            datesDiplomas: (editor.datesDiplomas ?? "").trim(),
          };
          updateDiploma(editor.idx, payload);
        }
        else if (editor.type === "diplomaNew") {
          const payload = {
            titleDiploma: (editor.titleDiploma ?? "").trim(),
            school: (editor.school ?? "").trim(),
            locationSchool: (editor.locationSchool ?? "").trim(),
            datesDiplomas: (editor.datesDiplomas ?? "").trim(),
          };
          setNewOffer(prev => {
            const next = deepClone(prev);
            const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
            cv0.diplomas = Array.isArray(cv0.diplomas) ? cv0.diplomas : [];
            cv0.diplomas.push(payload);
            return next;
          });
        }
        
        else if (editor.type === "xp") {
        const t = (editor.titleXP ?? "").trim();
        const d = (editor.dates ?? "").trim();
        updateXp(editor.idx, {
          titleXP: t,
          dates: d,
        });
      } 
      
      else if (editor.type === "xpTasks") {
        const arr = (editor.tasks || [])
          .map((t) => (t || "").trim())
          .filter((t) => t.length > 0);
      
        updateXpTasks(editor.idx, arr);
      } 
      
      else if (editor.type === "xpFull") {
        const t = (editor.titleXP ?? "").trim();
        const d = (editor.dates ?? "").trim();
        const tasks = (editor.tasks || []).map(x => (x || "").trim()).filter(Boolean);
      
        setNewOffer(prev => {
          const next = deepClone(prev);
          const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
          cv0.experiences = Array.isArray(cv0.experiences) ? cv0.experiences : [];
      
          const idx = editor.idx;
          if (idx == null || idx >= cv0.experiences.length) {
            cv0.experiences.push({ titleXP: t, dates: d, tasks });
          } else {
            cv0.experiences[idx] = {
              ...(cv0.experiences[idx] || {}),
              titleXP: t, dates: d, tasks,
            };
          }
          return next;
        });
      }
      
      
      else if (editor.type === "status") {
        const val = (editor.value || "").trim();
        setNewOffer(prev => {
          const next = deepClone(prev);
          const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
          cv0.personal_info = cv0.personal_info || {};
          cv0.personal_info.status = val;
          return next;
        });
      } else if (editor.type === "statusSpe") {
        const val = (editor.value || "").trim();
        setNewOffer(prev => {
          const next = deepClone(prev);
          const cv0 = next.cvInfos?.[0] ?? (next.cvInfos = [{}], next.cvInfos[0]);
          cv0.personal_info = cv0.personal_info || {};
          cv0.personal_info.statusSPE = val;
          return next;
        });
      }

      setEditor(null);
    } catch (e) {
      alert("Format invalide. Vérifie le contenu (JSON pour XP, liste/texte pour le reste).");
    }
  }



  // cancel editor
  function cancelEditor() {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setEditor(null);
  }

  function cancelRemoveDiplomas() {
    setDiplomaRemoveSel(new Set());
    setDiplomaRemoveMode(false);
  }

  function cancelRemoveLanguages() {
    setLangRemoveSel(new Set());
    setLangRemoveMode(false);
  }

  function cancelRemoveSkills() {
    setSkillsRemoveSel({});
    setSkillsRemoveMode(false);
  }

  function cancelRemoveXp() {
    setXpRemoveSel(new Set());
    setXpRemoveMode(false);
  }

  // Reset
  const resetChanges = () => {
    setNewOffer(structuredClone(offer));
  };

  // --- validate output ---
  function handleValidate() {
    console.log("✅ newOffer:", newOffer);
    onValidate?.(newOffer);
  }

  if (showCv) {
    return createPortal(
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
        onTouchStartCapture={stop}
        onTouchEndCapture={stop}
        onPointerDownCapture={stop}
        onPointerUpCapture={stop}
      >
        <CvA4Page offer={newOffer} onClose={() => setShowCv(false)} />
      </div>,
      document.body
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        flexDirection: "column",
        width: "100%",
        height: "90%",
        maxHeight: "100%",
        padding: 0,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <h2 style={{ fontSize: "33px", marginTop: "0%" }}>On change quoi?</h2>

      <div
        style={{
          width: "100%",
          maxWidth: 980,
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          marginBottom: 30,
          marginTop: -9,
        }}
        onTouchStartCapture={stop}
        onTouchEndCapture={stop}
        onPointerDownCapture={stop}
        onPointerUpCapture={stop}
      >

    {/* Carte Accordéons */}
        <div style={styles.card}>
          <button
            type="button"
            onClick={() => setOpenPersonal((v) => !v)}
            aria-expanded={openPersonal}
            aria-controls="personal-panel"
            style={styles.accordionBtn}
          >
            {openPersonal ? "▼" : "▶"} <strong style={{ fontSize: "21px" }}>Personal Infos :</strong>
          </button>

          {openPersonal && (
            <div id="personal-panel" style={{ padding: 12 }}>
              <ul style={{ margin: 0, paddingLeft: 0, lineHeight: 1.8 }}>

                <div style={{display:"flex", justifyContent:"center", position: "relative"}}>
                  <strong>Status</strong> : {label(personal.status)}
                  <div
                      role="button"
                      title="Modifier la liste"
                      style={{ cursor: "pointer", position: "absolute", right: 0 }}
                      onClick={() => openStatusEditor(personal.status)}
                    >
                      ⚙️
                  </div>
                </div>


                <div style={{display:"flex", justifyContent:"center", position: "relative"}}>
                  <strong>StatusSpe</strong> : {label(personal.statusSPE)}
                  <div
                      role="button"
                      title="Modifier la liste"
                      style={{ cursor: "pointer", position: "absolute", right: 0 }}
                      onClick={() => openStatusSpeEditor(personal.statusSPE)}
                    >
                      ⚙️
                  </div>
                </div>

                <div><strong>Location</strong> : {label(personal.location)}</div>
                <div>
                  <strong>Langues</strong> :
                  <ul style={{ marginTop: 6, paddingLeft: 0 }}>
                    {languages.map((lang, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {langRemoveMode && (
                          <input
                            type="checkbox"
                            checked={langRemoveSel.has(i)}
                            onChange={() => toggleLanguageRemovalSelection(i)}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                        {`${lang.name ?? ""}: ${lang?.level ? " " + lang.level : ""}`}
                        </div>
                       
                        {!langRemoveMode && (
                          <div
                            role="button"
                            title="Modifier la langue"
                            style={{ cursor: "pointer" }}
                            onClick={() => openLangEditor(i, lang)}
                          >
                            ⚙️
                          </div>
                        )}
                      </div>
                    ))}
                  </ul>
                </div>
              </ul>
              {!langRemoveMode ? (
                    <>
                      <button onClick={openLangAdder} style={{ marginTop: 6, opacity: 0.9 }}>
                        Ajouter
                      </button>
                      <button
                        onClick={() => setLangRemoveMode(true)}
                        style={{ opacity: 0.9, marginLeft: "7px" }}
                      >
                        Retirer
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={confirmRemoveSelectedLanguages}
                        style={{ opacity: 0.9, marginLeft: "7px", color: "crimson", fontWeight: 600 }}
                      >
                        Confirmer suppression
                      </button>
                      <button
                        onClick={cancelRemoveLanguages}
                        style={{ opacity: 0.9, marginLeft: "7px" }}
                      >
                        Annuler
                      </button>
                    </>
                  )}
            </div>
          )}

          {/* Diplômes */}
          <button
            type="button"
            onClick={() => setOpenDiplomas((v) => !v)}
            aria-expanded={openDiplomas}
            aria-controls="diplomas-panel"
            style={styles.accordionBtn}
          >
            {openDiplomas ? "▼" : "▶"} <strong style={{ fontSize: "21px" }}>Diplomes :</strong>
          </button>

          {openDiplomas && (
            <div id="diplomas-panel" style={{ paddingLeft: 0 }}>
              <ul style={{ margin: 0, lineHeight: 1.8, paddingLeft: 0, fontSize: "15px" }}>
                {diplomas.map((d, i) => {
                  const title = d?.titleDiploma || `Diplôme ${i + 1}`;
                  const key = `${title}-${i}`;
                  const isOpen = !!openDiplomaKeys[key];
                  const checked = diplomaRemoveMode && diplomaRemoveSel.has(i);
                
                  return (
                    <div key={key} style={{ marginBottom: 8, paddingLeft: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {diplomaRemoveMode && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDiplomaRemovalSelection(i)}
                          />
                        )}
          
                        <button
                          type="button"
                          onClick={() => toggleDiploma(key)}
                          aria-expanded={isOpen}
                          aria-controls={`dip-${toId(key)}`}
                          style={styles.accordionBtn}
                        >
                          {isOpen ? <span style={{ fontSize: "10px" }}>▼</span> : <span style={{ fontSize: "10px" }}>▶</span>} {title}
                        </button>
                      
                        {!diplomaRemoveMode && (
                          <div
                            role="button"
                            title="Modifier le diplôme"
                            style={{ cursor: "pointer" }}
                            onClick={() => openDiplomaEditor(d, i)}
                          >
                            ⚙️
                          </div>
                        )}
                      </div>
                      
                      {isOpen && (
                        <div id={`dip-${toId(key)}`} style={{ marginLeft: 0 }}>
                          <div><strong>École :</strong> {label(d?.school)}</div>
                          <div><strong>Lieu :</strong> {label(d?.locationSchool)}</div>
                          <div><strong>Dates :</strong> {label(d?.datesDiplomas || d?.dates)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
          
                {/* Actions */}
                {!diplomaRemoveMode ? (
                  <>
                    <button onClick={openDiplomaNew} style={{ marginTop: 6, opacity: 0.9 }}>
                      Ajouter
                    </button>
                    <button
                      onClick={() => setDiplomaRemoveMode(true)}
                      style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
                    >
                      Retirer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={confirmRemoveSelectedDiplomas}
                      style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px", color: "crimson", fontWeight: 600 }}
                    >
                      Confirmer suppression
                    </button>
                    <button
                      onClick={cancelRemoveDiplomas}
                      style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Skills */}
          <button
            type="button"
            onClick={() => setOpenSkills((v) => !v)}
            aria-expanded={openSkills}
            aria-controls="skills-panel"
            style={styles.accordionBtn}
          >
            {openSkills ? "▼" : "▶"} <strong style={{ fontSize: "21px" }}>Skills :</strong>
          </button>

          {openSkills && (
            <div id="skills-panel" style={{ padding: 12, }}>
              <ul style={{ margin: 0, paddingLeft: 0 }}>
                {Object.entries(skills).map(([k, arr]) => {
                  const list = Array.isArray(arr) ? arr : [];
                  const isOpen = !!openSkillKeys[k];
                  return (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {skillsRemoveMode && (
                          <input
                          type="checkbox"
                          checked={!!isGroupFullySelected(k, list)}
                          onChange={() => toggleGroupRemovalSelection(k, list)}
                        />
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSkill(k)}
                          aria-expanded={isOpen}
                          aria-controls={`skills-${k}`}
                          style={styles.accordionBtn}
                        >
                          {isOpen ? <span style={{ fontSize: "13px" }}>▼</span> : <span style={{ fontSize: "13px" }}>▶</span>}
                          <strong>{k}</strong> :
                        </button>
                      
                        {!skillsRemoveMode && (
                          <div
                            role="button"
                            title="Modifier la liste"
                            style={{ cursor: "pointer" }}
                            onClick={() => openSkillEditor(k, list)}
                          >
                            ⚙️
                          </div>
                        )}
                      </div>

                      {isOpen && (
                        <div id={`skills-${k}`} style={{ marginLeft: "-21%", display:"flex" }}>
                          <ul style={{ marginTop: 4, marginBottom: 0, marginLeft: 20 }}>
                            {list.map((v, i) => {
                              const checked = !!(skillsRemoveSel[k] && skillsRemoveSel[k].has(i));
                              return (
                                <div key={`${k}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {skillsRemoveMode && (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleSkillRemovalSelection(k, i)}
                                    />
                                  )}
                                  <div>{v}</div>
                                </div>
                              );
                            })}
                            <div style={{ opacity: 0.7 }}>valeur = {list.length}</div>
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={openNewSkillEditor} style={{ marginTop: 6, opacity: 0.9 }}>
                  Ajouter
                </button>

                {!skillsRemoveMode ? (
                  <button
                    onClick={() => setSkillsRemoveMode(true)}
                    style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
                  >
                    Retirer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={confirmRemoveSelectedSkills}
                      style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px", color: "crimson", fontWeight: 600 }}
                    >
                      Confirmer suppression
                    </button>
                    <button
                      onClick={cancelRemoveSkills}
                      style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Experiences */}
          <button
            type="button"
            onClick={() => setOpenExperiences((v) => !v)}
            aria-expanded={openExperiences}
            aria-controls="xp-panel"
            style={styles.accordionBtn}
          >
            {openExperiences ? "▼" : "▶"} <strong style={{ fontSize: "21px" }}>Expériences :</strong>
          </button>

          {openExperiences && (
            <div id="xp-panel" style={{ padding: 12 }}>
              <ul style={{ margin: 0, paddingLeft: 0 }}>
                {experiences.slice(1).map((xp, idx) => {
                  const realIdx = idx + 1;
                  const title = xp?.titleXP || xp?.title || `Title Xp[${realIdx + 1}]`;
                  const key = `${title}-${realIdx}`;
                  const isOpenXp = !!openXpKeys[key];
                  const isTasksOpen = !!openXpTaskKeys[key];
                  const checked = xpRemoveMode && xpRemoveSel.has(realIdx);

              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {xpRemoveMode && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleXpRemovalSelection(realIdx)}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => toggleXp(key)}
                      aria-expanded={isOpenXp}
                      aria-controls={`xp-panel-${toId(key)}`}
                      style={styles.accordionBtn}
                    >
                      {isOpenXp ? <span style={{ fontSize: "13px" }}>▼</span> : <span style={{ fontSize: "13px" }}>▶</span>}
                      <strong>- {title}</strong> :
                    </button>

                    {!xpRemoveMode && (
                      <div
                        role="button"
                        title="Modifier titre/dates"
                        style={{ cursor: "pointer" }}
                        onClick={() => openXpEditor(xp, realIdx)}
                      >
                        ⚙️
                      </div>
                    )}
                  </div>

                  {isOpenXp && (
                    <div id={`xp-panel-${toId(key)}`} style={{ marginLeft: 0 }}>
                      <div>Dates : {label(xp?.dates)}</div>

                      {/* Tasks */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => toggleXpTasks(key)}
                          aria-expanded={isTasksOpen}
                          aria-controls={`xp-tasks-${toId(key)}`}
                          style={styles.accordionBtn}
                        >
                          <div style={{ marginTop: 4, paddingLeft: 20 }}>
                            {isTasksOpen ? <span style={{ fontSize: "10px" }}>▼</span> : <span style={{ fontSize: "10px" }}>▶</span>} Tasks :
                          </div>
                        </button>

                        {!xpRemoveMode && (
                          <div
                            role="button"
                            title="Modifier tasks"
                            style={{ cursor: "pointer" }}
                            onClick={() => openXpTasksEditor(xp, realIdx)}
                          >
                            ⚙️
                          </div>
                        )}
                      </div>

                      {isTasksOpen && (
                        <ul id={`xp-tasks-${toId(key)}`} style={{ marginTop: 4, marginBottom: 0, paddingLeft: 0 }}>
                          {(xp?.tasks || []).map((t, i) => (
                            <p key={`${key}-task-${i}`}>{t}</p>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

      {/* Actions */}
      {!xpRemoveMode ? (
        <>
          {/* AJOUT → éditeur combiné */}
          <button
            onClick={() => openXpFullEditor(null, experiences.length)}
            style={{ marginTop: 6, opacity: 0.9 }}
          >
            Ajouter
          </button>
          <button
            onClick={() => setXpRemoveMode(true)}
            style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
          >
            Retirer
          </button>
        </>
      ) : (
        <>
          <button
            onClick={confirmRemoveSelectedXp}
            style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px", color: "crimson", fontWeight: 600 }}
          >
            Confirmer suppression
          </button>
          <button
            onClick={cancelRemoveXp}
            style={{ opacity: 0.9, marginLeft: "7px", marginBottom: "19px" }}
          >
            Annuler
          </button>
        </>
      )}
    </ul>
  </div>
  )}
</div> {/* Carte Accordéons */} 
</div> {/* Wrapper Accordéons */} 


{/* Btns Global */} 
<div 
style={{
  position: "absolute", 
  display:"flex", 
  justifyContent:"center",
  gap:"7vw",
  zIndex:"999999",
  bottom: -10,
  fontSize: 21,
}}
  onTouchStartCapture={stop}
  onTouchEndCapture={stop}
  onPointerDownCapture={stop}
  onPointerUpCapture={stop}
>
    <button
      onClick={() => {
        resetChanges()
        console.log("reset")
      }}
      style={{
        all:"unset",
        pointer: "cursor",
        background: "rgba(255, 255, 255, 0.86)",
        width:"17vw",
        borderRadius:"7px",
      }}
    >
      Reset
    </button>

    <button
      onClick={() => setShowCv(true)}
      onTouchStartCapture={stop}
      onTouchEndCapture={stop}
      onPointerDownCapture={stop}
      onPointerUpCapture={stop}
      style={{ 
        all:"unset",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.86)",
        width:"21vw",
        borderRadius:"7px",
      }}
    >
      Preview
    </button>

    <button
      style={{ 
        all:"unset",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.86)",
        width:"21vw",
        borderRadius:"7px",
      }}
      onClick={()=> {
        handleValidate()
        console.log("valider", newOffer)
      }}
    >
      Valider
    </button>
</div>

{/* --- Editor Modal --- */}
  {editor && (
    <div
      onClick={cancelEditor}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onTouchStartCapture={stop}
      onTouchEndCapture={stop}
      onPointerDownCapture={stop}
      onPointerUpCapture={stop}
    >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            bottom: 75,
            position:"absolute",
            width: "70vw",
            height: "60vh",
            background: "white",
            borderRadius: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
            padding: 16,
          }}
          onTouchStartCapture={stop}
          onTouchEndCapture={stop}
          onPointerDownCapture={stop}
          onPointerUpCapture={stop}
        >
            <div style={{ 
              fontWeight: 600, 
              marginBottom: 8,  
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              position:"a"
            }}>{editor.title}</div>

            {editor?.type === "lang" && (
                <>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Langue (ex: Anglais, Japonais)
                  </label>
                  <textarea
                    rows={1}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                    placeholder='ex: Anglais'
                    value={editor.value?.name ?? ""}
                    onChange={(e) => setEditor({ ...editor, value: { ...editor.value, name: e.target.value } })}
                  />

                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Niveau (ex: B2/C1, JLPT N5)
                  </label>
                  <textarea
                    rows={1}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                    placeholder='ex: B2/C1'
                    value={editor.value?.level ?? ""}
                    onChange={(e) => setEditor({ ...editor, value: { ...editor.value, level: e.target.value } })}
                  />
                </>
            )}


            {(editor.type === "diploma" || editor.type === "diplomaNew") && (
              <>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Intitulé du diplôme
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                  placeholder="ex: Master Informatique"
                  value={editor.titleDiploma ?? ""}
                  onChange={(e) => setEditor({ ...editor, titleDiploma: e.target.value })}
                />
            
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  École
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                  placeholder="ex: Université de Paris"
                  value={editor.school}
                  onChange={(e) => setEditor({ ...editor, school: e.target.value })}
                />
            
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Lieu
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                  placeholder="ex: Paris"
                  value={editor.locationSchool}
                  onChange={(e) => setEditor({ ...editor, locationSchool: e.target.value })}
                />
            
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Dates
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                  placeholder="ex: 2018 – 2020"
                  value={editor.datesDiplomas}
                  onChange={(e) => setEditor({ ...editor, datesDiplomas: e.target.value })}
                />
              </>
            )}


            {(editor.type === "skill" || editor.type === "skillNew") && (
                <>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Nom du groupe
                  </label>
                  <textarea
                    rows={1}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                    value={editor.newKey ?? ""}
                    onChange={(e) => setEditor({ ...editor, newKey: e.target.value })}
                    placeholder="ex: FRONTEND"
                  />
              
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Liste des skills (séparées par des virgules)
                  </label>
                  <textarea
                    rows={6}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                    placeholder={editor.placeholder}
                    value={editor.value}
                    onChange={(e) => setEditor({ ...editor, value: e.target.value })}
                  />
                </>
              )}

              {editor.type === "xp" && (
                <>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Intitulé (titleXP)
                  </label>
                  <textarea
                    rows={2}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                    placeholder="ex: DÉVELOPPEUR FULLSTACK"
                    value={editor.titleXP}
                    onChange={(e) => setEditor({ ...editor, titleXP: e.target.value })}
                  />

                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                    Dates
                  </label>
                  <textarea
                    rows={2}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                    placeholder="ex: 2023 – 2025"
                    value={editor.dates}
                    onChange={(e) => setEditor({ ...editor, dates: e.target.value })}
                  />
                </>
              )}


              {editor.type === "xpTasks" && (
                <div>
                  {editor.tasks.map((task, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                        Tâche {i + 1}
                      </label>
                      <textarea
                        rows={2}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                        placeholder={`Ex: Développement d'une API...`}
                        value={task}
                        onChange={(e) => {
                          const next = [...editor.tasks];
                          next[i] = e.target.value;
                        
                          // garde toujours une case vide en bas
                          if (i === editor.tasks.length - 1 && e.target.value.trim() !== "") {
                            next.push("");
                          }
                          setEditor({ ...editor, tasks: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}


            {editor.type === "xpFull" && (
              <>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Intitulé (titleXP)
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                  placeholder="ex: DÉVELOPPEUR FULLSTACK"
                  value={editor.titleXP}
                  onChange={(e) => setEditor({ ...editor, titleXP: e.target.value })}
                />
            
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Dates
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", marginBottom: 12 }}
                  placeholder="ex: 2023 – 2025"
                  value={editor.dates}
                  onChange={(e) => setEditor({ ...editor, dates: e.target.value })}
                />
            
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                  Tasks (une par case)
                </label>
                <div>
                  {editor.tasks.map((task, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <textarea
                        rows={2}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: "16px" }}
                        placeholder={`Ex: Développement d'une API...`}
                        value={task}
                        onChange={(e) => {
                          const next = [...editor.tasks];
                          next[i] = e.target.value;
                          // Option : toujours garder une dernière case vide
                          if (i === editor.tasks.length - 1 && e.target.value.trim() !== "") {
                            next.push("");
                          }
                          setEditor({ ...editor, tasks: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}


            {editor.type === "status" && (
              <textarea
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", fontSize: "20px" }}
                placeholder={editor.placeholder}
                value={editor.value}
                onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              />
            )}   
                      

            {editor.type === "statusSpe" && (
              <textarea
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", fontSize: "20px" }}
                placeholder={editor.placeholder}
                value={editor.value}
                onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              />
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, fontSize: "23px" }}>
              <button onClick={cancelEditor}>Annuler</button>
              <button onClick={saveEditor} style={{ fontWeight: 600 }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    width: "90%",
    margin: "0 auto",
    background: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    padding: 8,
    boxSizing: "border-box",
    maxWidth: 980,
  },
  accordionBtn: {
    width: "100%",
    textAlign: "left",
    padding: "5px 14px",
    marginBottom: "5px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    color: "black",
  },
};