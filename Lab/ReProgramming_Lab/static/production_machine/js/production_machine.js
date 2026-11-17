function DisplayProductionMachine(data) {
    const OutputsId = ["Paper_Form_ProductionMachine","Paper_Form_ProductionMachine_Details"]
    
    for (const id of OutputsId) {
        let position = document.getElementById(id);
        data.result.forEach(x => {
            if(!position.querySelector(`[value="${x.id}"]`)) {
                position.insertAdjacentHTML("beforeend",`
                    <option value="${x.id}">${x.Name}</option>
                `)
            }
        })
    }
}