import { saveCartographie, loadCartographie } from '../../../services/firestore.service.js';

let cartographieData = [];

// Liste officielle des types d'entités (CDC Section 3.2.C.3)
const TYPES_ENTITES = [
    "Centre de formation",
    "Johrei Center",
    "Unité religieuse",
    "Foyer de Lumière",
    "Noyau de salut"
];

export async function renderStatistiques(appMain) {
    appMain.innerHTML = `<p>Chargement des statistiques depuis le Cloud...</p>`;

    try {
        const cloudData = await loadCartographie();
        
        if (cloudData) {
            cartographieData = cloudData;
            localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
        } else {
            const savedData = localStorage.getItem('emm_rdc_data');
            if (savedData) {
                cartographieData = JSON.parse(savedData);
            } else {
                const response = await fetch('./data/cartographie-init.json');
                cartographieData = await response.json();
            }
            await saveCartographie(cartographieData);
        }

        renderUI(appMain);

    } catch (error) {
        console.error("Erreur:", error);
        appMain.innerHTML = `<p style="color:red;">Erreur de connexion au Cloud.</p>`;
    }
}

function renderUI(appMain) {
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
            <h2 style="color:#0d8a38; margin:0; font-size:18px;">Statistiques Nationales</h2>
            <div style="display:flex; gap:5px;">
                <button id="btn-add-prov" style="background:#0a6e2c; color:white; border:none; padding:6px 10px; border-radius:5px; font-size:12px;">+ Province</button>
                <button id="btn-export-csv" style="background:#0d8a38; color:white; border:none; padding:6px 10px; border-radius:5px; font-size:12px;">Exporter CSV</button>
            </div>
        </div>
        <p style="font-size:12px; color:#666; margin-bottom:15px;">Culte du : <input type="date" id="date-culte" style="border:1px solid #ccc; padding:4px; border-radius:4px;"></p>
    `;

    let grandTotalMB = 0, grandTotalSY = 0, grandTotalNV = 0;

    cartographieData.forEach((provinceData, provIndex) => {
        let provMB = 0, provSY = 0, provNV = 0;

        html += `
            <div style="background:white; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.1); overflow:hidden;">
                <div style="background:#043c16; color:white; padding:10px; font-weight:bold; font-size:14px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${provinceData.province}</span>
                    <button class="btn-add-entite" data-prov="${provIndex}" style="background:rgba(255,255,255,0.2); color:white; border:none; padding:3px 8px; border-radius:3px; font-size:11px; cursor:pointer;">+ Entité</button>
                </div>
                <div style="padding:10px; overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:600px;">
                        <thead>
                            <tr style="border-bottom:1px solid #eee; text-align:left; color:#666;">
                                <th style="padding:5px;">Type</th>
                                <th style="padding:5px;">Dénomination</th>
                                <th style="padding:5px; text-align:center;">MB</th>
                                <th style="padding:5px; text-align:center;">SY</th>
                                <th style="padding:5px; text-align:center;">NV</th>
                                <th style="padding:5px; text-align:center;">Total</th>
                                <th style="padding:5px; text-align:center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        provinceData.entites.forEach((entite, entiteIndex) => {
            const totalEntite = entite.mb + entite.sy + entite.nv;
            provMB += entite.mb;
            provSY += entite.sy;
            provNV += entite.nv;

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:5px; color:#888; font-size:11px;">${entite.type}</td>
                    <td style="padding:5px; font-weight:bold;">${entite.nom}</td>
                    <td style="padding:5px; text-align:center;">
                        <input type="number" class="input-effectif" data-prov="${provIndex}" data-entite="${entiteIndex}" data-field="mb" value="${entite.mb}" style="width:40px; text-align:center; border:1px solid #ddd; border-radius:3px; padding:2px;">
                    </td>
                    <td style="padding:5px; text-align:center;">
                        <input type="number" class="input-effectif" data-prov="${provIndex}" data-entite="${entiteIndex}" data-field="sy" value="${entite.sy}" style="width:40px; text-align:center; border:1px solid #ddd; border-radius:3px; padding:2px;">
                    </td>
                    <td style="padding:5px; text-align:center;">
                        <input type="number" class="input-effectif" data-prov="${provIndex}" data-entite="${entiteIndex}" data-field="nv" value="${entite.nv}" style="width:40px; text-align:center; border:1px solid #ddd; border-radius:3px; padding:2px;">
                    </td>
                    <td style="padding:5px; text-align:center; font-weight:bold; color:#0d8a38;">${totalEntite}</td>
                    <td style="padding:5px; text-align:center;">
                        <button class="btn-edit-entite" data-prov="${provIndex}" data-entite="${entiteIndex}" style="background:none; border:none; cursor:pointer; font-size:14px;">✏️</button>
                        <button class="btn-delete-entite" data-prov="${provIndex}" data-entite="${entiteIndex}" style="background:none; border:none; cursor:pointer; font-size:14px;">🗑️</button>
                    </td>
                </tr>
            `;
        });

        const provTotal = provMB + provSY + provNV;
        grandTotalMB += provMB;
        grandTotalSY += provSY;
        grandTotalNV += provNV;

        html += `
                        </tbody>
                        <tfoot style="background:#f9f9f9; font-weight:bold;">
                            <tr>
                                <td colspan="2" style="padding:8px; text-align:right;">Sous-total :</td>
                                <td style="padding:8px; text-align:center;">${provMB}</td>
                                <td style="padding:8px; text-align:center;">${provSY}</td>
                                <td style="padding:8px; text-align:center;">${provNV}</td>
                                <td style="padding:8px; text-align:center; color:#0a6e2c;">${provTotal}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    });

    const grandTotal = grandTotalMB + grandTotalSY + grandTotalNV;
    html += `
        <div id="grand-total-card" style="background:linear-gradient(135deg, #0d8a38, #0a6e2c); color:white; padding:15px; border-radius:8px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.2); margin-bottom: 20px;">
            <h3 style="margin:0; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Total Général RDC</h3>
            <div style="display:flex; justify-content:space-around; margin-top:10px; font-size:16px;">
                <div>MB<br><b id="total-mb">${grandTotalMB}</b></div>
                <div>SY<br><b id="total-sy">${grandTotalSY}</b></div>
                <div>NV<br><b id="total-nv">${grandTotalNV}</b></div>
                <div style="border-left:1px solid rgba(255,255,255,0.3); padding-left:10px;">TOTAL<br><b id="total-gen">${grandTotal}</b></div>
            </div>
        </div>
    `;

    appMain.innerHTML = html;

    // --- ÉVÉNEMENTS ---

    // 1. Modifier un chiffre
    document.querySelectorAll('.input-effectif').forEach(input => {
        input.addEventListener('change', async (e) => {
            const provIndex = e.target.getAttribute('data-prov');
            const entiteIndex = e.target.getAttribute('data-entite');
            const field = e.target.getAttribute('data-field');
            const newValue = parseInt(e.target.value) || 0;

            cartographieData[provIndex].entites[entiteIndex][field] = newValue;
            
            localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
            renderUI(appMain);
            await saveCartographie(cartographieData);
        });
    });

    // 2. Exporter CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
        exportToCSV(cartographieData);
    });
    
    // 3. Ajouter Province
    document.getElementById('btn-add-prov').addEventListener('click', async () => {
        const nom = prompt("Nom de la nouvelle province :");
        if (nom) {
            cartographieData.push({ province: nom.toUpperCase().trim(), entites: [] });
            localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
            renderUI(appMain);
            await saveCartographie(cartographieData);
        }
    });

    // 4. Ajouter Entité
    document.querySelectorAll('.btn-add-entite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const provIndex = e.target.getAttribute('data-prov');
            const nom = prompt("Nom de l'entité :");
            if (nom) {
                cartographieData[provIndex].entites.push({
                    type: "Foyer de Lumière", // Par défaut
                    nom: nom.toUpperCase().trim(),
                    mb: 0, sy: 0, nv: 0, obs: ""
                });
                localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
                renderUI(appMain);
                await saveCartographie(cartographieData);
            }
        });
    });

    // 5. Modifier une entité (Nom, Type, OBS)
    document.querySelectorAll('.btn-edit-entite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const provIndex = e.target.getAttribute('data-prov');
            const entiteIndex = e.target.getAttribute('data-entite');
            const entite = cartographieData[provIndex].entites[entiteIndex];

            // Créer une modale simple avec du HTML injecté
            const modal = document.createElement('div');
            modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:1000; padding:20px;";
            
            let optionsHtml = TYPES_ENTITES.map(t => `<option value="${t}" ${entite.type === t ? 'selected' : ''}>${t}</option>`).join('');

            modal.innerHTML = `
                <div style="background:white; padding:20px; border-radius:8px; width:100%; max-width:400px;">
                    <h3 style="margin-top:0;">Modifier l'entité</h3>
                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:12px;">Nom</label>
                        <input type="text" id="edit-nom" value="${entite.nom}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:12px;">Type</label>
                        <select id="edit-type" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:12px;">Observations</label>
                        <textarea id="edit-obs" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; height:60px;">${entite.obs || ''}</textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button id="btn-cancel-edit" style="padding:8px 15px; border:none; background:#eee; border-radius:4px;">Annuler</button>
                        <button id="btn-save-edit" style="padding:8px 15px; border:none; background:#0d8a38; color:white; border-radius:4px;">Enregistrer</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-cancel-edit').onclick = () => modal.remove();
            
            document.getElementById('btn-save-edit').onclick = async () => {
                cartographieData[provIndex].entites[entiteIndex].nom = document.getElementById('edit-nom').value.toUpperCase().trim();
                cartographieData[provIndex].entites[entiteIndex].type = document.getElementById('edit-type').value;
                cartographieData[provIndex].entites[entiteIndex].obs = document.getElementById('edit-obs').value;
                
                modal.remove();
                localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
                renderUI(appMain);
                await saveCartographie(cartographieData);
            };
        });
    });

    // 6. Supprimer une entité
    document.querySelectorAll('.btn-delete-entite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const provIndex = e.target.getAttribute('data-prov');
            const entiteIndex = e.target.getAttribute('data-entite');
            const nomEntite = cartographieData[provIndex].entites[entiteIndex].nom;

            if (confirm(`Voulez-vous vraiment supprimer l'entité "${nomEntite}" ?`)) {
                cartographieData[provIndex].entites.splice(entiteIndex, 1);
                localStorage.setItem('emm_rdc_data', JSON.stringify(cartographieData));
                renderUI(appMain);
                await saveCartographie(cartographieData);
            }
        });
    });
}

function exportToCSV(data) {
    let csvContent = "PROVINCE;TYPE;DENOMINATION;MB;SY;NV;TOTAL;OBS\n";
    
    data.forEach(prov => {
        let provMB = 0, provSY = 0, provNV = 0;
        prov.entites.forEach(e => {
            const total = e.mb + e.sy + e.nv;
            provMB += e.mb; provSY += e.sy; provNV += e.nv;
            csvContent += `${prov.province};${e.type};${e.nom};${e.mb};${e.sy};${e.nv};${total};${e.obs || ""}\n`;
        });
        csvContent += `${prov.province};SOUS-TOTAL;;${provMB};${provSY};${provNV};${provMB+provSY+provNV};\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Frequence_EMM_RDC.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}