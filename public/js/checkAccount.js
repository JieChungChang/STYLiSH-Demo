const menberDetailIcon    = document.querySelector("#member-detail-icon");
const menberDetailSideBar = document.querySelector("#member-detail-sidebar");
const sideBarCloseIcon    = document.querySelector(".close");
const userProfileButton   = document.getElementById("user-profile-button");
const logOutButton        = document.getElementById("log-out-button");
const singInButton        = document.getElementById("sign-in-button");  

menberDetailIcon.addEventListener('click', showMenberDetail);
sideBarCloseIcon.addEventListener('click', closeMenberDetail);

userProfileButton.addEventListener('click', checkProfile);
logOutButton.addEventListener('click', logOut);
singInButton.addEventListener('click', signIn);

function removeCookies() {
    var res = document.cookie;
    var multiple = res.split(";");
    for(var i = 0; i < multiple.length; i++) {
       var key = multiple[i].split("=");
       document.cookie = key[0]+" =; path = /; expires = Thu, 01 Jan 1970 00:00:00 UTC";
    }
}

function checkProfile() {
	window.location.assign("/user/userProfile.html");
}

function signIn() {
    removeCookies()
	window.location.assign("/user/sign.html");
}

function logOut() {
	removeCookies();
	window.location.reload();
}

function showMenberDetail() {
	menberDetailSideBar.style.display = 'block';
	sideBarCloseIcon.style.display = 'block';
}

function closeMenberDetail() {
	menberDetailSideBar.style.display = 'none';
	sideBarCloseIcon.style.display = 'none';
}

function getAccessTokenFromCookie() {
	//取得 user profile API Data
	let accessToken = document.cookie.split('access_token=')[1];

	let xhr = new XMLHttpRequest();
	xhr.open("GET", "/api/1.0/user/profile", false);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);

	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			var result = JSON.parse(xhr.responseText);
			if ( result.error ) {
				document.getElementById("check-account-result").innerText = "Hi 訪客，您尚未登入！";
				userProfileButton.style.display = "none";
				singInButton.style.display = "block";
				logOutButton.style.display = "none";

			} else {
				let userName  = result.data.user.name;
				document.getElementById("check-account-result").innerText = "Hi " + userName + "，歡迎回來！";
				userProfileButton.style.display = "block";
				singInButton.style.display = "none";
				logOutButton.style.display = "block";
			}
		}
	};
	
	xhr.send();
}

// function getAccessTokenFromCookie() {
// 	//取得 user profile API Data
// 	let accessToken   = document.cookie.substring(13);
	
// 	let xhr = new XMLHttpRequest();
// 	xhr.open("GET", "/api/1.0/user/profile", false);
// 	xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);

// 	xhr.onreadystatechange = function () {
// 		if (xhr.readyState === 4 && xhr.status === 200) {
// 			var result = JSON.parse(xhr.responseText);
// 			if ( result.error ) {
// 				document.getElementById("check-account-result").innerText = "Hi 訪客，您尚未登入！";
// 				userProfileButton.style.display = "none";
// 				singInButton.style.display = "block";
// 				logOutButton.style.display = "none";

// 			} else {
// 				let userName  = result.data.user.name;
// 				document.getElementById("check-account-result").innerText = "Hi " + userName + "，歡迎回來！";
// 				userProfileButton.style.display = "block";
// 				singInButton.style.display = "none";
// 				logOutButton.style.display = "block";
// 			}
// 		}
// 	};
	
// 	xhr.send();
// }

getAccessTokenFromCookie();