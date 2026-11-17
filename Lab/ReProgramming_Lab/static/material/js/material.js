function DisplayMaterial(data) {
    const OutputsId = ["Material_Form"]
    let Locations = ["paper_details_section_8","paper_section_8"]
    for (let i=0;i<Locations.length;i++) {
        
        const loc = document.querySelector(`#${Locations[i]} .form_body`);
        console.log(i);
        if(data.result && loc) {
            for (const mat of data.result) {
                if (!loc.querySelector(`[name=Material_Form_Object_${mat.id}]`)) {
                    loc.insertAdjacentHTML("beforeend",`
                        <div class="form_multi_group">
                            <div class="header">
                                <div class="form_group check-box">
                                    <input id="Material_Form_Object_${mat.id}" name="Material_Form_Object_${mat.id}" type="checkbox" onchange="SetMaterialUsageRequired(${mat.id})">
                                    <label for="Material_Form_Object_${mat.id}" style="font-size: var(--lg-font);">${mat.Name}</label>
                                </div>
                            </div>
                            <div class="body">
                                <div class="form_group">
                                    <input id="Material_Form_Value_${mat.id}" name="Material_Form_Value_${mat.id}" type="number" step="0.01" placeholder="مثال: 8">
                                    <label for="Material_Form_Value_${mat.id}">مقدار</label>
                                </div>
                                <div class="form_group">
                                    <input id="Material_Form_Dissolved_Amount_${mat.id}" name="Material_Form_Dissolved_Amount_${mat.id}" type="number" max="4000"
                                            oninput="if(this.value > 4000) {
                                                this.value = 4000;
                                                AM_alert({status : 'error', text:'مقدار باید بین 1 تا 4000 باشد',btns:false,obj:false});
                                            }
                                            "
                                            placeholder="1 تا 4000">
                                    <label for="Material_Form_Dissolved_Amount_${mat.id}">محلول در آب</label>
                                </div>
                                <div class="form_group">
                                    <input id="Material_Form_Brand_${mat.id}" name="Material_Form_Brand_${mat.id}" type="text" step="0.01" placeholder="مثال: RUSTIN SHIMI" list="brand_suggestion">
                                    <label for="Material_Form_Brand_${mat.id}">برند</label>
                                </div>
                                <div class="form_group">
                                    <input id="Material_Form_Desc_${mat.id}" name="Material_Form_Desc_${mat.id}" type="text" step="0.01" placeholder="">
                                    <label for="Material_Form_Desc_${mat.id}">توضیحات</label>
                                </div>
                            </div>
                        </div>
                    `)
                }
            }
        }
        
    }
}


function SetMaterialUsageRequired(id) {
    // const target = document.getElementById(`Material_Form_Object_${id}`);
    // let target_inputs = target.parentElement.parentElement.parentElement.querySelectorAll("input");
    // if (target.checked) {
    //     for (const x of target_inputs) {
    //         if(!x.id.includes("Desc")) {
    //             x.setAttribute("required_input","");
    //         }
    //     }
    // } else {
    //     for (const x of target_inputs) {
    //         x.removeAttribute("required_input");
    //     }
    // }
}