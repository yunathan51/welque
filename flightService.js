const API_URL_TEMPLATE = (departureAirport, arrivalAirport, departureTime, passengers) =>
    `https://api-air-flightsearch-green.smiles.com.br/v1/airlines/search?cabin=ALL&originAirportCode=${departureAirport}&destinationAirportCode=${arrivalAirport}&departureDate=${departureTime}&adults=${passengers}`;

const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "X-Api-Key": "aJqPU7xNHl9qN3NVZnPaJ208aPo2Bh2p2ZV844tw",
    "Origin": "https://www.smiles.com.br",
    "Region": "BRASIL",
    "Referer": "https://www.smiles.com.br/",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Language": "pt-BR",
    "Channel": "Web"
};

let airports = [];
let milesMultiplier = 1;

async function loadAirports() {
    const response = await fetch('airports.html');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    airports = Array.from(doc.querySelectorAll('option')).map(option => ({
        code: option.value,
        name: option.textContent
    })).filter(airport => airport.code !== "");
}

function autocomplete(inp, arr) {
    inp.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllLists();
        if (!val) { return false; }

        a = document.getElementById(this.id + "List");
        if (!a) {
            a = document.createElement("UL");
            a.setAttribute("id", this.id + "List");
            a.setAttribute("class", "autocomplete-list");
            this.parentNode.appendChild(a);
        }

        a.innerHTML = '';
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].name.toUpperCase().includes(val.toUpperCase()) || arr[i].code.toUpperCase().includes(val.toUpperCase())) {
                const airport = arr[i];
                b = document.createElement("LI");
                b.innerHTML = `<strong>${airport.name} (${airport.code})</strong>`;
                b.addEventListener("click", function() {
                    inp.value = `${airport.name} (${airport.code})`;
                    inp.dataset.code = airport.code;
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });

    function closeAllLists(elmnt) {
        let x = document.getElementsByClassName("autocomplete-list");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

async function searchFlights() {
    const departureAirport = document.getElementById('departureAirport').dataset.code;
    const arrivalAirport = document.getElementById('arrivalAirport').dataset.code;
    const departureDate = document.getElementById('departureDate').value;
    const passengers = document.getElementById('passengerCount').textContent;
    const resultsContainer = document.getElementById('flightResults');

    resultsContainer.innerHTML = 'Buscando voos...';

    const url = API_URL_TEMPLATE(departureAirport, arrivalAirport, departureDate, passengers);

    try {
        const response = await axios.get(url, { headers: HEADERS });
        const flights = parseFlightJson(response.data);
        displayFlights(flights);
    } catch (error) {
        console.error("An error occurred while searching for flights:", error);
        resultsContainer.innerHTML = 'Ocorreu um erro ao buscar os voos. Por favor, tente novamente.';
    }
}

function parseFlightJson(json) {
    const flights = [];

    json.requestedFlightSegmentList?.forEach(segment => {
        segment.flightList?.forEach(flight => {
            const { departure, arrival, fareList } = flight;
            const { code: departureAirport } = departure.airport;
            const { code: arrivalAirport } = arrival.airport;
            const departureTime = moment(departure.date).format("HH:mm");
            const arrivalTime = moment(arrival.date).format("HH:mm");
            const passengerCount = json.passenger?.adults || 0;

            if (fareList?.length > 1) {
                const secondFare = fareList[1];
                const miles = secondFare.miles;
                const costTax = parseFloat(secondFare.g3?.costTax) || 0;

                flights.push({
                    aeroportoSaida: departureAirport,
                    aeroportoChegada: arrivalAirport,
                    horaDeSaida: departureTime,
                    horaDeChegada: arrivalTime,
                    qtdPassageiros: passengerCount,
                    milhas: miles,
                    taxa: costTax.toFixed(2)
                });
            }
        });
    });

    return flights;
}

function displayFlights(flights) {
    const resultsContainer = document.getElementById('flightResults');
    resultsContainer.innerHTML = '';

    if (flights.length === 0) {
        resultsContainer.innerHTML = 'Nenhum voo encontrado para esta pesquisa.';
        return;
    }

    flights.forEach(flight => {
        const flightCard = document.createElement('div');
        flightCard.className = 'flight-card';
        const totalValue = (parseFloat(flight.milhas) * milesMultiplier / 1000 + parseFloat(flight.taxa)).toFixed(2);
        flightCard.innerHTML = `
            <div class="route-section">
                <span>${flight.aeroportoSaida}</span>
                <span class="arrow">➜</span>
                <span class="arrival">${flight.aeroportoChegada}</span>
                <div class="vertical-line"></div>
            </div>
            <div class="duration-section">
                <div class="vertical-line"></div>
                ${flight.horaDeSaida} - ${flight.horaDeChegada}
            </div>
            <div class="price-section">
                <div>R$ ${totalValue} POR PESSOA</div>
            </div>
        `;
        resultsContainer.appendChild(flightCard);
    });
}

function setupConfigModal() {
    const configIcon = document.getElementById('configIcon');
    const configModal = document.getElementById('configModal');
    const saveConfig = document.getElementById('saveConfig');
    const multiplierInput = document.getElementById('multiplier');

    configIcon.addEventListener('click', () => {
        configModal.style.display = 'block';
    });

    saveConfig.addEventListener('click', () => {
        milesMultiplier = parseFloat(multiplierInput.value);
        configModal.style.display = 'none';
        alert(`Multiplicador de milhas atualizado para ${milesMultiplier}`);
    });

    window.addEventListener('click', (event) => {
        if (event.target === configModal) {
            configModal.style.display = 'none';
        }
    });
}

function setupPassengerSelector() {
    const selector = document.getElementById('passengerSelector');
    const count = document.getElementById('passengerCount');
    const dropdown = document.getElementById('passengerDropdown');

    count.addEventListener('click', () => {
        selector.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!selector.contains(e.target)) {
            selector.classList.remove('active');
        }
    });

    const options = document.querySelectorAll('.passenger-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            count.textContent = option.dataset.value;
            selector.classList.remove('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAirports();
    autocomplete(document.getElementById("departureAirport"), airports);
    autocomplete(document.getElementById("arrivalAirport"), airports);
    document.getElementById('searchButton').addEventListener('click', searchFlights);
    setupConfigModal();
    setupPassengerSelector();
});