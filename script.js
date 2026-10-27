document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("point-form");
    const yInput = document.getElementById("y-input");
    const clearBtn = document.getElementById("clear-btn");
    const requestError = document.getElementById("request-error");
    const canvas = document.getElementById("graph-canvas");
    const ctx = canvas.getContext("2d");
    let history = [];
    const savedHistory = localStorage.getItem("lab2History");
    if (savedHistory!==null){
        history = JSON.parse(savedHistory);
        updateTable();
    }
    drawGraph();

    let selectedX = null;
    let selectedR = null;

    const xButtons = document.querySelectorAll(".x-button");
    const rButtons = document.querySelectorAll(".r-button");

    xButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectedX = button.value;
            xButtons.forEach((item =>{
                item.classList.remove("selected");
            }));
            button.classList.add("selected");
            document.getElementById("x-error").textContent = "";
            console.log("Выбран X: ", selectedX);
        });
    }); 

    rButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectedR = button.value;
            rButtons.forEach((item =>{
                item.classList.remove("selected");
            }));
            button.classList.add("selected");
            document.getElementById("r-error").textContent = "";
            console.log("Выбран R: ", selectedR);
        });
    });

    function translaterBigNumber(value){
        const val = value.trim();
        const match = val.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
        if (!match) {
            return null;
        }
        const integerPart = match[2];
        const afterDot = match[3] || "";
        const digits = integerPart + afterDot;
        let up = BigInt(digits);
        if (match[1] === "-") {
            up = -up;
        }
        const down = 10n ** BigInt(afterDot.length);
        return {up: up, down: down};
    }

    function validateY(){
        const yError = document.getElementById("y-error");
        const yVal = yInput.value.trim().replace(',', '.');
        if (yVal === ''){
            yError.textContent = "Введите Y";
            return false;
        }
        const yNum = translaterBigNumber(yVal);
        if (yNum === null){
            yError.textContent = "Y должен быть числом!";
            return false;
        }
        const uplimit = 5n * yNum.down;
        const dwlimit = -3n * yNum.down;
        if (yNum.up <= dwlimit || yNum.up >= uplimit){
            yError.textContent = "Y должен быть в диапазоне от -3 до 5";
            return false;
        }
        yError.textContent = '';
        return yVal;
    }

    function getXValue(){
        const xError = document.getElementById('x-error');
        if (selectedX === null){
            xError.textContent = "Выберите X";
            return false;
        }
        xError.textContent="";
        return selectedX;
    }

    function getRValue(){
        const rError = document.getElementById('r-error');
        if (selectedR === null){
            rError.textContent = "Выберите R";
            return false;
        }
        rError.textContent = "";
        return selectedR;
        
    }

    form.addEventListener("submit", function(event){
        event.preventDefault();
        requestError.textContent ="";
        const y = validateY();
        const x = getXValue();
        const r = getRValue();
        
        if (x === false || y === false || r === false){
            return;
        }
        const params = new URLSearchParams({x,y,r});
        const url = `/fcgi-bin/server.jar?${params.toString()}`;
        fetch(url, {
            method: 'GET'
        })
        .then(response => {
            if (response.status===400){
                requestError.textContent="Сервер отклонил данные. Проверьте: X-целое от -5 до 3, "
                +"Y-строго от -3 до 5, R = 1, 1.5, 2, 2.5, 3.";
                throw new Error("Сервер вернул HTTP 400");
            }
            if (!response.ok) {
                requestError.textContent = "Не удалось выполнить проверку: ошибка сервера "+response.status+ ". Попробуйте позже.";
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            return response.json(); 
        })
        .then(data => {
            history.push(data);
            localStorage.setItem("lab2History", JSON.stringify(history));
            updateTable();
            drawGraph();
            console.log("Ответ от сервера получен: ", data);
        })
        .catch(error => {
            console.error("Ошибка проверки точки: ", error);
            if (requestError.textContent===""){
                requestError.textContent="Не удалось получить корректный ответ. "+
                "Проверьте подключение и убедитесь, что все запущено.";
            }
        });
    });

    function updateTable(){
        const tbody = document.getElementById("results-body");
        const emptyMessage = document.getElementById("empty-message");
        tbody.innerHTML = "";
        if (history.length === 0){
            emptyMessage.style.display = "block";
        } else {
            emptyMessage.style.display = "none";
        }
        
        for (let i = 0; i < history.length; i++){
            const entry = history[i];
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleString('ru-RU',{
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            let hitText = "";
            let hitClass = "";
            if (entry.hit === true){
                hitText = "Попадание";
                hitClass = "result-hit";
            } else {
                hitText = "Промах";
                hitClass = "result-miss";
            }
            tbody.innerHTML += `
                <tr>
                    <td>${entry.xVal}</td>
                    <td>${entry.yVal}</td>
                    <td>${entry.rVal}</td>
                    <td class="${hitClass}">${hitText}</td>
                    <td>${formattedDate}</td>
                    <td>${entry.timeScript} мс</td>
                </tr>    
            `;
        }
    }

    clearBtn.addEventListener("click", ()=>{
        history = [];
        localStorage.removeItem("lab2History");
        updateTable();
        drawGraph();
    });

    function drawGraph(){
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width/2;
        const centerY = height/2;
        const R = 150;
        //rect
        ctx.clearRect(0,0,width,height);
        ctx.fillStyle="#3498db"
        ctx.fillRect(centerX-R, centerY - R/2, R, R/2);
        //trianle
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX+R/2, centerY);
        ctx.lineTo(centerX, centerY+R);
        ctx.closePath();
        ctx.fill();
        //circle
        ctx.beginPath();
        ctx.moveTo(centerX,centerY);
        ctx.arc(centerX, centerY, R, Math.PI/2, Math.PI);
        ctx.closePath();
        ctx.fill();


        ctx.fillStyle="black";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        //X    
        ctx.beginPath();
        ctx.moveTo(0,centerY);
        ctx.lineTo(width, centerY);
        ctx.lineTo(width-10, centerY-5);
        ctx.moveTo(width, centerY);
        ctx.lineTo(width-10, centerY+5);
        ctx.stroke();
        //Y
        ctx.beginPath();
        ctx.moveTo(centerX, height);
        ctx.lineTo(centerX,0);
        ctx.lineTo(centerX-5,10);
        ctx.moveTo(centerX,0);
        ctx.lineTo(centerX+5,10);
        ctx.stroke();

        ctx.font = "14px serif";
        ctx.fillText("R", centerX+R-5, centerY-10);
        ctx.fillText("R/2", centerX+R/2-10, centerY-10);
        ctx.fillText("-R/2", centerX-R/2-15,centerY-10);
        ctx.fillText("-R", centerX-R-10, centerY-10);

        ctx.fillText("R", centerX+10, centerY-R+5);
        ctx.fillText("R/2", centerX+10, centerY-R/2+5);
        ctx.fillText("-R/2", centerX+10,centerY+R/2+5);
        ctx.fillText("-R", centerX+10, centerY+R+5);
    
    }
});