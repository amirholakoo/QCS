function SetSectionsFormFlow() {
    const section_forms = document.querySelectorAll(".section_page.active [section_target]");
    console.log(section_forms);
    for (const x of section_forms) {
        x.onclick = ()=> {
            reset_sections_form(x);
            const target_key = x.getAttribute("section_target");
            const target = document.getElementById(target_key);
            target.classList.add("active");
            document.querySelector(`[section_target=${target_key}]`).classList.add("active");
        }
    }
}

function reset_sections_form(obj) {
    const active_section_forms = document.querySelectorAll(".section_page.active .title.active[section_target]")[0];
    active_section_forms.classList.remove("active");
    document.getElementById(active_section_forms.getAttribute("section_target")).classList.remove("active");
}


const all_input = document.querySelectorAll(".form_section input,.form_section select,.form_section textarea");
for (const x of all_input) {
    x.onchange = ()=> {
        const section = x.parentElement.parentElement.parentElement;
        const section_all_input = section.querySelectorAll('input, select, textarea')
        const section_valid_input = [...section_all_input].filter(el => el.value !== '');
        console.log(section_all_input.length,section_valid_input.length)
        let percentage = Math.round((100/section_all_input.length)*section_valid_input.length);
        const section_nav_title = document.querySelector(`[section_target=${section.id}]`)
        section_nav_title.setAttribute("percentage",percentage);
        section_nav_title.style.setProperty('--percentage', `${percentage}%`);
    }
}


function DisplayFormsDate(data) {
    document.getElementById("Paper_Form_Date").value = data.result;
    // AM_alert({status : 'info', text:`توجه داشته باشید برخی مقادیر به صورت اتوماتیک جایگذاری میشوند.`,btns:false,obj:false});
}