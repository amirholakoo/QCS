function AddBrandsSuggestion(data) {
    const OutputsId = ["brand_suggestion"]
    
    for (const id of OutputsId) {
        let position = document.getElementById(id);
        data.result.forEach(x => {
            if(!position.querySelector(`[value="${x.id}"]`)) {
                position.insertAdjacentHTML("beforeend",`
                    ${'<option value="'+ x.Name +'">'}`
                )
            }
        })
    };
}