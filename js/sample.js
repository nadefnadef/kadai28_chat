import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyAIbDeSnXmTeabYBbpSnSbzfojnjG3KKck",
    authDomain: "sample-c0906.firebaseapp.com",
    databaseURL: "https://sample-c0906-default-rtdb.firebaseio.com",
    projectId: "sample-c0906",
    storageBucket: "sample-c0906.appspot.com",
    messagingSenderId: "998441269743",
    appId: "1:998441269743:web:084093f158d1de9339de1a",
    measurementId: "G-8KQZ45QPVP"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", function () {
    const toggleFormButton = document.querySelector(".toggle-form-button");
    const formContainer = document.querySelector(".form-container");
    const form = document.getElementById("emergencyForm");
    const submitBtn = document.getElementById("submitBtn");
    const clearBtn = document.getElementById("clearBtn");
    const incidentTypeSelect = document.getElementById("incidentType");
    const rescueDetails = document.getElementById("rescueDetails");
    const peopleCountInput = document.getElementById("peopleCount");
    const unknownPeopleCheckbox = document.getElementById("unknownPeople");
    const openMapBtn = document.getElementById("openMapBtn");

    // フォームの表示/非表示を切り替え
    toggleFormButton.addEventListener("click", function () {
        formContainer.style.display = formContainer.style.display === "none" || formContainer.style.display === "" ? "block" : "none";
    });

    // フォーム送信時の処理を修正
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const incidentType = incidentTypeSelect.value;
        const peopleCount = peopleCountInput.value;
        const unknownPeopleChecked = unknownPeopleCheckbox.checked;

        if (incidentType === "要救助者あり" && !(peopleCount || unknownPeopleChecked)) {
            alert("人数欄または「人数不明・複数人」にチェックをつけてください。");
            return;
        }

        try {
            const postData = await getFormData();
            await savePostToFirebase(postData); // 非同期処理の完了を待つ
            form.reset();
            submitBtn.disabled = true;
            submitBtn.classList.add("disabled");
            formContainer.style.display = "none";
        } catch (error) {
            console.error("Error while submitting the form:", error);
        }
    });

    // フォームデータを取得してオブジェクトとして返す（非同期処理）
    async function getFormData() {
        const photoFile = document.getElementById("photo").files[0];
        let photoBase64 = null;

        if (photoFile) {
            photoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    resolve(e.target.result);
                };
                reader.readAsDataURL(photoFile);
            });
        }

        function extractLatLngFromMapLink(mapLink) {
            const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
            const match = mapLink.match(regex);
            return match ? `${match[1]}, ${match[2]}` : '';
        }

        const mapLink = document.getElementById("mapLink").value;
        const latLng = extractLatLngFromMapLink(mapLink);

        return {
            date: new Date().toLocaleString(),
            katakanaName: document.getElementById("katakanaName").value,
            kanjiName: document.getElementById("kanjiName").value,
            organization: document.getElementById("organization").value,
            department: document.getElementById("department").value,
            position: document.getElementById("position").value,
            phone: document.getElementById("phone").value,
            email: document.getElementById("email").value,
            landmark: document.getElementById("landmark").value,
            incidentType: document.getElementById("incidentType").value,
            area: document.getElementById("area").value,
            address: document.getElementById("address").value,
            mapLink: mapLink,
            latLng: latLng,
            photo: photoBase64,
            memo: document.getElementById("memo").value,
            numberOfPeople: unknownPeopleCheckbox.checked ? "不明・複数人" : document.getElementById("peopleCount").value
        };
    }

    // クリアボタンのクリック時の処理
    clearBtn.addEventListener("click", function () {
        form.reset();
        localStorage.removeItem("emergencyFormData");
        submitBtn.disabled = true;
        submitBtn.classList.add("disabled");
    });


    // 「要救助者あり」を選択した際に人数欄を表示する処理
    incidentTypeSelect.addEventListener("change", function () {
        if (incidentTypeSelect.value === "要救助者あり") {
            rescueDetails.style.display = "block";
        } else {
            rescueDetails.style.display = "none";
        }
    });

    // 人数不明チェックボックスが変更されたときの処理
    unknownPeopleCheckbox.addEventListener("change", function () {
        if (unknownPeopleCheckbox.checked) {
            peopleCountInput.disabled = true;
            peopleCountInput.style.backgroundColor = "#d3d3d3"; // グレーアウト
        } else {
            peopleCountInput.disabled = false;
            peopleCountInput.style.backgroundColor = ""; // 元の背景色に戻す
        }
    });

    // フォームの入力要素を取得
    const formInputs = form.querySelectorAll('input, select, textarea');

    // 各入力要素にイベントリスナーを追加
    formInputs.forEach(input => {
        input.addEventListener('input', updateSubmitButtonState);
    });

    // updateSubmitButtonState 関数を修正
    function updateSubmitButtonState() {
        const requiredFields = form.querySelectorAll('[required]');
        let allFieldsFilled = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                allFieldsFilled = false;
            }
        });

        const incidentType = incidentTypeSelect.value;
        const peopleCount = peopleCountInput.value;
        const unknownPeopleChecked = unknownPeopleCheckbox.checked;

        if (incidentType === "要救助者あり" && !(peopleCount || unknownPeopleChecked)) {
            allFieldsFilled = false;
        }

        submitBtn.disabled = !allFieldsFilled;
        submitBtn.classList.toggle("disabled", !allFieldsFilled);
    }

    // 初期状態でボタンの状態を更新
    updateSubmitButtonState();

    // Google Mapsを開くボタンのクリックイベント
    openMapBtn.addEventListener("click", function () {
        const area = document.getElementById("area").value;
        const address = document.getElementById("address").value;
        const fullAddress = `静岡県下田市 ${area} ${address}`;
        const encodedAddress = encodeURIComponent(fullAddress);
        const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        window.open(googleMapsURL, '_blank'); // 新しいタブで開く
    });

    // Firebaseに投稿を保存する関数
    async function savePostToFirebase(postData) {
        const postsRef = ref(database, 'posts');
        const newPostRef = push(postsRef);
        try {
            await set(newPostRef, postData);
            console.log("Data saved successfully");
            loadPostsFromFirebase();  // データ保存後に再読み込み
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }

    // Firebaseから投稿を読み込む関数
    function loadPostsFromFirebase() {
        const postsRef = ref(database, 'posts');
        onValue(postsRef, (snapshot) => {
            const posts = snapshot.val();
            if (posts) {
                const tableBody = document.querySelector("#postsTable tbody");
                tableBody.innerHTML = '';  // テーブルをクリア
                Object.values(posts).reverse().forEach(post => addPostToTable(post));
            }
        }, (error) => {
            console.error("Error loading data: ", error);
        });
    }

    // 投稿をテーブルに追加する関数を修正
    function addPostToTable(post) {
        const tableBody = document.querySelector("#postsTable tbody");
        const row = document.createElement("tr");

        // 各セルにデータを追加
        row.appendChild(createCell(post.date));
        row.appendChild(createClickableCell('読み仮名', post.katakanaName));
        row.appendChild(createClickableCell('名前', post.kanjiName));
        row.appendChild(createCell(post.organization));
        row.appendChild(createCell(post.department));
        row.appendChild(createClickableCell('役職名', post.position));
        row.appendChild(createClickableCell('TEL', post.phone));
        row.appendChild(createClickableCell('MAIL', post.email));
        row.appendChild(createCell(post.landmark));
        row.appendChild(createCell(post.incidentType));
        row.appendChild(createCell(post.area));
        row.appendChild(createCell(post.address));

        // 緯度経度のセル
        const latLngCell = document.createElement("td");
        if (post.latLng) {
            const latLngElement = document.createElement("a");
            latLngElement.href = `https://www.google.com/maps?q=${post.latLng}`;
            latLngElement.textContent = post.latLng;
            latLngElement.target = "_blank";
            latLngCell.appendChild(latLngElement);
        }
        row.appendChild(latLngCell);

        const photoCell = document.createElement("td");
        if (post.photo) {
            const img = document.createElement("img");
            img.src = post.photo;
            img.alt = "写真";
            img.style.maxWidth = "100px";  // 画像サイズを制限
            photoCell.appendChild(img);
        }
        row.appendChild(photoCell);

        // 詳細（メモ）のセル
        const memoCell = document.createElement("td");
        memoCell.className = "memo-cell";
        memoCell.textContent = post.memo || ''; // メモが存在しない場合は空文字列を設定
        row.appendChild(memoCell);

        // 要救助者人数のセル
        row.appendChild(createCell(post.numberOfPeople || (post.unknownPeople ? '不明・複数' : '')));

        // 削除ボタンのセル
        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";
        deleteButton.className = "delete-btn";
        deleteButton.onclick = function() {
            // 削除処理を実装する（後述）
        };
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);

        tableBody.insertBefore(row, tableBody.firstChild);
    }

    function createCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    function createClickableCell(displayText, fullText) {
        const cell = document.createElement('td');
        const displaySpan = document.createElement('span');
        displaySpan.textContent = displayText;
        displaySpan.style.color = 'blue';
        displaySpan.style.textDecoration = 'underline';
        displaySpan.style.cursor = 'pointer';
        cell.appendChild(displaySpan);

        let detailBox = null;

        displaySpan.addEventListener('click', () => {
            if (detailBox) {
                cell.removeChild(detailBox);
                detailBox = null;
            } else {
                detailBox = document.createElement('div');
                detailBox.textContent = fullText;
                detailBox.style.backgroundColor = '#f0f0f0';
                detailBox.style.padding = '5px';
                detailBox.style.marginTop = '5px';
                cell.appendChild(detailBox);
            }
        });

        return cell;
    }

    // ページ読み込み時にFirebaseから投稿を取得
    loadPostsFromFirebase();

    // CSV抽出ボタンのイベントリスナーを追加
    document.getElementById('csvExportBtn').addEventListener('click', exportToCSV);

    // CSV抽出関数
    function exportToCSV() {
        const table = document.getElementById('postsTable');
        let csv = [];
        
        // ヘッダー行を追加
        let header = [];
        for (let cell of table.rows[0].cells) {
            header.push(cell.textContent);
        }
        csv.push(header.join(','));

        // データ行を追加
        for (let i = 1; i < table.rows.length; i++) {
            let row = [];
            for (let cell of table.rows[i].cells) {
                // クリック可能なセルの場合、フルテキストを取得
                if (cell.querySelector('span')) {
                    row.push(cell.lastChild ? cell.lastChild.textContent : cell.querySelector('span').textContent);
                } else {
                    row.push(cell.textContent);
                }
            }
            csv.push(row.join(','));
        }

        // CSVデータを作成
        const csvContent = "data:text/csv;charset=utf-8," + csv.join('\n');

        // ダウンロードリンクを作成
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emergency_reports.csv");
        document.body.appendChild(link);

        // ダウンロードを開始
        link.click();
    }

    // 集計データを更新し、表を再描画する関数
    function updateSummaryTable() {
        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        const summary = {};

        posts.forEach(post => {
            if (!summary[post.location]) {
                summary[post.location] = {
                    incidents: {},
                    rescueNeeded: 0,
                    unknownMultiple: 0
                };
            }

            if (!summary[post.location].incidents[post.incidentType]) {
                summary[post.location].incidents[post.incidentType] = 0;
            }
            summary[post.location].incidents[post.incidentType]++;

            if (post.rescueNeeded === '不明・複数人') {
                summary[post.location].unknownMultiple++;
            } else {
                summary[post.location].rescueNeeded += parseInt(post.rescueNeeded) || 0;
            }
        });

        const container = document.getElementById('summaryTableContainer');
        container.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'summary-table';

        // ヘッダー行の作成
        const headerRow = table.insertRow();
        ['発生場所', '事態種別', '要救助者人数', '不明・複数人'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // データ行の作成
        for (const [location, data] of Object.entries(summary)) {
            const row = table.insertRow();
            row.insertCell().textContent = location;
            row.insertCell().textContent = Object.entries(data.incidents)
                .map(([type, count]) => `${type}: ${count}`)
                .join(', ');
            row.insertCell().textContent = data.rescueNeeded;
            row.insertCell().textContent = data.unknownMultiple;
        }

        container.appendChild(table);
    }

    // 既存の投稿追加関数を修正
    function addPost(post) {
        // ... 既存のコード ...

        updateSummaryTable(); // 集計表を更新
    }

    // 初期表示時に集計表を生成
    updateSummaryTable();
});



