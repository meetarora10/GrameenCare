document.addEventListener('DOMContentLoaded', function () {
    // Get DOM elements
    const chatBtn = document.getElementById('chat-btn');
    const navChatbot = document.getElementById('nav-chatbot');
    const languageToggle = document.getElementById('language-toggle'); // Language toggle button

    let recognition;
    let isListening = false;
    let silenceTimeout;

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        // Set the initial language from localStorage or default to English
        let currentLanguage = localStorage.getItem('language') || 'en';
        recognition.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';

        recognition.onresult = function (event) {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            const symptomSearch = document.getElementById('symptom-search');
            if (symptomSearch) {
                symptomSearch.value = transcript;

                // Trigger suggestions automatically
                const searchTerm = transcript.toLowerCase();
                if (searchTerm.length >= 2) {
                    const filteredSymptoms = allSymptoms.filter(symptom =>
                        symptom.toLowerCase().includes(searchTerm)
                    );
                    displaySymptomSuggestions(filteredSymptoms);
                }
            }

            // Reset the silence timeout
            resetSilenceTimeout();
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = function () {
            isListening = false;
            toggleSpeechButton(false);
        };
    } else {
        console.warn('Speech recognition not supported in this browser.');
    }

    // Function to toggle speech recognition
    function toggleSpeechRecognition() {
        if (isListening) {
            recognition.stop();
            isListening = false;
            toggleSpeechButton(false);
        } else {
            recognition.start();
            isListening = true;
            toggleSpeechButton(true);

            // Start silence timeout
            startSilenceTimeout();
        }
    }

    // Function to toggle the button text
    function toggleSpeechButton(listening) {
        const speechButton = document.getElementById('speech-btn');
        speechButton.textContent = listening ? 'Stop' : 'Speak';
    }

    // Function to start the silence timeout
    function startSilenceTimeout() {
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
            if (isListening) {
                recognition.stop();
                isListening = false;
                toggleSpeechButton(false);
                console.log('Speech recognition stopped due to silence.');
            }
        }, 5000); // Stop after 5 seconds of silence
    }

    // Function to reset the silence timeout
    function resetSilenceTimeout() {
        clearTimeout(silenceTimeout);
        startSilenceTimeout();
    }

    // Update speech recognition language when the language toggle is clicked
    if (languageToggle) {
        languageToggle.addEventListener('click', function () {
            const currentLanguage = localStorage.getItem('language') || 'en';
            recognition.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';
            console.log(`Speech recognition language updated to: ${recognition.lang}`);
        });
    }

    // Add event listener to the speech button
    const speechButton = document.getElementById('speech-btn');
    if (speechButton) {
        speechButton.addEventListener('click', toggleSpeechRecognition);
    }

    // Attach event listeners
    if (chatBtn) chatBtn.addEventListener('click', openChatInterface);
    if (navChatbot) navChatbot.addEventListener('click', openChatInterface);

    // Initialize symptom data
    let selectedSymptoms = [];
    let allSymptoms = [];

    // Fetch all symptoms from the backend
    function fetchSymptoms() {
        fetch('/get_symptoms')
            .then(response => response.json())
            .then(data => {
                allSymptoms = data.symptoms;
                console.log('Available symptoms:', allSymptoms);
            })
            .catch(error => console.error('Error fetching symptoms:', error));
    }

    // Call the function to fetch symptoms when the page loads
    fetchSymptoms();

    // Function to open chat interface
    function openChatInterface(e) {
        e.preventDefault();

        // Create chatbot interface
        const main = document.querySelector('main');
        main.innerHTML = `
            <div class="chatbot-container">
                <h2>GrameenCare Health Assistant</h2>
                <p>Please select your symptoms for diagnosis:</p>
                
                <div class="symptom-selector">
                    <input type="text" id="symptom-search" placeholder="Search for symptoms...">
                    <button id="speech-btn" class="btn">Speak</button> <!-- Speech-to-text button -->
                    <div id="symptom-suggestions" class="suggestions"></div>
                </div>
                
                <div class="selected-symptoms">
                    <h3>Selected Symptoms:</h3>
                    <ul id="selected-symptoms-list"></ul>
                </div>
                
                <button id="predict-btn" class="btn">Get Diagnosis</button>
                
                <div id="result-container" class="result-container hidden">
                    <h3>Diagnosis Results</h3>
                    <div id="diagnosis-result"></div>
                </div>
            </div>
        `;

        // Add event listeners to the new elements
        const symptomSearch = document.getElementById('symptom-search');
        const symptomSuggestions = document.getElementById('symptom-suggestions');
        const predictBtn = document.getElementById('predict-btn');
        const speechButton = document.getElementById('speech-btn');

        // Add event listener for symptom search
        if (symptomSearch) {
            symptomSearch.addEventListener('input', function () {
                const searchTerm = this.value.toLowerCase();
                if (searchTerm.length < 2) {
                    symptomSuggestions.innerHTML = '';
                    return;
                }

                const filteredSymptoms = allSymptoms.filter(symptom =>
                    symptom.toLowerCase().includes(searchTerm)
                );

                displaySymptomSuggestions(filteredSymptoms);
            });
        }

        // Add event listener for prediction button
        if (predictBtn) {
            predictBtn.addEventListener('click', getPrediction);
        }

        if (speechButton) {
            speechButton.addEventListener('click', toggleSpeechRecognition);
        }
    }

    // Function to display symptom suggestions
    function displaySymptomSuggestions(symptoms) {
        const suggestionContainer = document.getElementById('symptom-suggestions');
        suggestionContainer.innerHTML = '';

        symptoms.slice(0, 10).forEach(symptom => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.textContent = symptom.replace(/_/g, ' ');
            suggestionItem.addEventListener('click', function () {
                addSymptom(symptom);
                document.getElementById('symptom-search').value = '';
                suggestionContainer.innerHTML = '';
            });

            suggestionContainer.appendChild(suggestionItem);
        });
    }

    // Function to add a symptom to the selected list
    function addSymptom(symptom) {
        if (selectedSymptoms.includes(symptom)) return;

        selectedSymptoms.push(symptom);
        updateSelectedSymptomsList();
    }

    // Function to update the selected symptoms list in the UI
    function updateSelectedSymptomsList() {
        const selectedSymptomsList = document.getElementById('selected-symptoms-list');
        if (!selectedSymptomsList) return;

        selectedSymptomsList.innerHTML = '';

        selectedSymptoms.forEach(symptom => {
            const listItem = document.createElement('li');
            listItem.textContent = symptom.replace(/_/g, ' ');

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.classList.add('remove-btn');
            removeBtn.addEventListener('click', function () {
                removeSymptom(symptom);
            });

            listItem.appendChild(removeBtn);
            selectedSymptomsList.appendChild(listItem);
        });
    }

    // Function to remove a symptom from the selected list
    function removeSymptom(symptom) {
        selectedSymptoms = selectedSymptoms.filter(s => s !== symptom);
        updateSelectedSymptomsList();
    }

    // Function to get prediction based on selected symptoms
    function getPrediction() {
        if (selectedSymptoms.length === 0) {
            alert('Please select at least one symptom');
            return;
        }

        // Show loading state
        const resultContainer = document.getElementById('result-container');
        const diagnosisResult = document.getElementById('diagnosis-result');

        resultContainer.classList.remove('hidden');
        diagnosisResult.innerHTML = '<p>Analyzing your symptoms...</p>';

        // Send POST request to the backend
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symptoms: selectedSymptoms
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    diagnosisResult.innerHTML = `<p class="error">Error: ${data.error}</p>`;
                    return;
                }

                // Display the results
                displayResults(data);
            })
            .catch(error => {
                console.error('Error:', error);
                diagnosisResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            });
    }

    // Function to display the prediction results
    function displayResults(data) {
        const diagnosisResult = document.getElementById('diagnosis-result');

        // Create HTML for the results
        let resultsHtml = `
            <div class="diagnosis">
                <h4>Predicted Condition: ${data.predicted_disease}</h4>
                <div class="description">
                    <h5>Description:</h5>
                    <p>${data.description}</p>
                </div>
                
                <div class="precautions">
                    <h5>Precautions:</h5>
                    <ul>
                        ${(Array.isArray(data.precautions) ? data.precautions : [data.precautions])
                            .map(precaution => `<li>${precaution}</li>`)
                            .join('')}
                    </ul>
                </div>
                
                <div class="medications">
                    <h5>Recommended Medications:</h5>
                    <ul>
                        ${(Array.isArray(data.medications) ? data.medications : [data.medications])
                            .map(medication => `<li>${medication}</li>`)
                            .join('')}
                    </ul>
                </div>
                
                <div class="diet">
                    <h5>Dietary Recommendations:</h5>
                    <ul>
                        ${(Array.isArray(data.diet) ? data.diet : [data.diet])
                            .map(diet => `<li>${diet}</li>`)
                            .join('')}
                    </ul>
                </div>
                
                <div class="workout">
                    <h5>Workout Recommendations:</h5>
                    <ul>
                        ${data.workout.map(workout => `<li>${workout}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <p class="disclaimer">This is an AI-powered suggestion. Please consult a healthcare professional for proper diagnosis and treatment.</p>
            
            <button id="reset-btn" class="btn">Start New Diagnosis</button>
        `;

        diagnosisResult.innerHTML = resultsHtml;

        // Add event listener to reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                selectedSymptoms = [];
                updateSelectedSymptomsList();
                document.getElementById('result-container').classList.add('hidden');
            });
        }
    }
});