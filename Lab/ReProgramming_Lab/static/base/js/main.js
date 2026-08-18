// divider
function card_number_divider(str) {
	str = String(str);
	str = str.replace(/\,/g, "");
	var objRegex = new RegExp("(-?[0-9]+)([0-9]{4})");
	while (objRegex.test(str)) {
		str = str.replace(objRegex, "$1-$2")
	}
	return str
};

// progress
function Progress(display = true) {
  if (display) {
      document.getElementById('progressbar').style.display = 'flex';
  } else {
      document.getElementById('progressbar').style.display = '';
  }
}

// alert
function AM_alert({display=true,status = 'info', text=false,btns=false,obj=false}) {
    clearTimeout(this.timeoutID)
    let elem = document.getElementById('Alert');
    let classname = `alert_child_${elem.children.length}`
    if (display) {
        elem.classList.add('show_up');
        elem.insertAdjacentHTML('beforeend',
        `
        <div class="Am_alert_  ${classname} ${status}">
            <span class="alert_close_btn" onclick="AM_alert({display:false,obj:this.parentElement})">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 11L11 1" stroke="#B6B6B6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11 11L1 1" stroke="#B6B6B6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
            <div class="d-flex align-items-center ml-4 alert-text-card">
                <div class="icon">
                    <svg class="success" width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.5 36C28.125 36 36 28.125 36 18.5C36 8.875 28.125 1 18.5 1C8.875 1 1 8.875 1 18.5C1 28.125 8.875 36 18.5 36Z" stroke="#25B700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 18.5L16.6612 23L26 14" stroke="#25B700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="warning" width="39" height="37" viewBox="0 0 39 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.5889 12.9102V22.2051" stroke="#FFA800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.5888 35.9814H8.32336C1.87269 35.9814 -0.822836 31.3711 2.30026 25.7384L8.10028 15.2909L13.5657 5.4755C16.8747 -0.491834 22.3029 -0.491834 25.6119 5.4755L31.0773 15.3095L36.8773 25.757C40.0004 31.3897 37.2863 36 30.8542 36H19.5888V35.9814Z" stroke="#FFA800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.5762 27.7832H19.5929" stroke="#FFA800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="info" width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.5 0.999998C8.875 0.999998 1 8.875 1 18.5C1 28.125 8.875 36 18.5 36C28.125 36 36 28.125 36 18.5C36 8.875 28.125 0.999999 18.5 0.999998Z" stroke="#008DFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5 25.499L18.5 16.749" stroke="#008DFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.5117 11.501L18.496 11.501" stroke="#008DFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="danger" width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.5 36C28.125 36 36 28.125 36 18.5C36 8.875 28.125 1 18.5 1C8.875 1 1 8.875 1 18.5C1 28.125 8.875 36 18.5 36Z" stroke="#FF0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.5469 23.4524L23.4519 13.5474" stroke="#FF0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M23.4519 23.4524L13.5469 13.5474" stroke="#FF0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h6 class="alert-text">
                    ${text}
                    <div class="d-flex justify-content-center mt-2 alert_btns">
                </h6>
                    
                </div>
            </div>
        </div>
        `);
        if(btns) {
            for(const x of btns) {
                document.querySelector(`.${classname} .alert_btns`).insertAdjacentHTML('beforeend',`<a class="bg-light rounded px-3 py-2 mr-1" style="color:#333;" ${x.attr? x.attr.name+"='"+ x.attr.inner +"'":''} ${x.link? 'href='+x.link:'onclick="Am_alert({display:false,obj:this.parentElement.parentElement})"'}>${x.title}</a>`)
            }
        }
  
    } else {
        obj.remove();
        elem.classList.remove('show_up');
        classname = false
    }
    setTimeout(()=>{if(classname){document.getElementsByClassName(classname)[0].remove();elem.classList.remove('show_up');};this.timeoutID=32567},10000)
  }

// url params | k => key -- v => value
function Set_url_params(k,v) {
    console.log(k,v);
    let url = new URL(window.location.href);
    console.log(url);
    let params = new URLSearchParams(url.search);
    console.log(params,params.has(k));
    if (params.has(k)) {
        url.searchParams.set(k,v);
    } else {
        url.searchParams.append(k,v);
    }
    //window.location.href = url;
    console.log(url)
}

// let data = {"آذربايجان شرقي":["اسكو","اهر","ایلخچی","باسمنج","بستان آباد","بناب","تبريز","تسوج","جلفا","خسروشهر","سراب","سهند","شبستر","صوفیان","مراغه","مرند","ملكان","ممقان","ميانه","هاديشهر","هريس","هشترود","ورزقان"],"آذربايجان غربي":["اروميه","اشنويه","بوكان","تكاب","خوي","سر دشت","سلماس","شاهين دژ","ماكو","مهاباد","مياندوآب","نقده","پلدشت","پيرانشهر","چالدران"],"اردبيل":["اردبيل","خلخال","مشگين شهر","نمين","نير","پارس آباد","گرمي"],"اصفهان":["آران و بيدگل","اردستان","اصفهان","باغ بهادران","تودشک","تيران","حاجي آباد","خميني شهر","خوانسار","درچه","دهاقان","زرين شهر","سميرم","شهرضا","عسگران","علويجه","فلاورجان","كاشان","مباركه","نجف آباد","نطنز","ورزنه","کوهپایه","گلپايگان"],"ايلام":["آبدانان","ايلام","ايوان","دره شهر","دهلران","سرابله","مهران"],"بوشهر":["اهرم","برازجان","بوشهر","جم","خورموج","دير","عسلویه","كنگان","کاکی","گناوه"],"تهران":["اسلامشهر","باقرشهر","بومهن","تجريش","تهران","دماوند","رباط كريم","رودهن","ري","شريف آباد","شهريار","فشم","فيروزكوه","قدس","قرچك","كهريزك","لواسان","ملارد","ورامين","پاكدشت","چهاردانگه"],"چهارمحال بختياري":["اردل","بروجن","شهركرد","فارسان","لردگان","چلگرد"],"خراسان جنوبي":["بيرجند","سربيشه","فردوس","قائن","نهبندان"],"خراسان رضوي":["تايباد","تربت جام","تربت حيدريه","خواف","درگز","سبزوار","سرخس","طبس","طرقبه","فريمان","قوچان","كاشمر","مشهد","نيشابور","چناران","گناباد"],"خراسان شمالي":["آشخانه","اسفراين","بجنورد","جاجرم","شيروان"],"خوزستان":["آبادان","انديمشك","اهواز","ايذه","ايرانشهر","باغ ملك","بندر امام خميني","بندر ماهشهر","بهبهان","حمیدیه","خرمشهر","دزفول","رامشیر","رامهرمز","سوسنگرد","شادگان","شادگان","شوش","شوشتر","لالي","مسجد سليمان","ملاثانی","هنديجان","هويزه"],"زنجان":["آب بر","ابهر","خدابنده","خرمدره","زنجان","قيدار","ماهنشان"],"سمنان":["ايوانكي","بسطام","دامغان","سمنان","شاهرود","گرمسار"],"سيستان و بلوچستان":["ايرانشهر","خاش","زابل","زاهدان","سراوان","سرباز","ميرجاوه","چابهار"],"فارس":["آباده","اردكان","ارسنجان","استهبان","اقليد","بوانات","جهرم","حاجي آباد","خرامه","خنج","داراب","زرقان","سروستان","سوريان","سپيدان","شيراز","صفاشهر","فراشبند","فسا","فيروز آباد","كازرون","لار","لامرد","مرودشت","مهر","کوار"],"قزوين":["آبيك","بوئين زهرا","تاكستان","قزوين"],"قم":["قم"],"کرج":["اشتهارد","طالقان","كرج","ماهدشت","نظرآباد","هشتگرد"],"كردستان":["بانه","بيجار","حسن آباد","سقز","سنندج","صلوات آباد","قروه","مريوان"],"كرمان":["انار","بافت","بردسير","بم","جيرفت","راور","رفسنجان","زرند","سيرجان","كرمان","كهنوج","کوهبنان"],"كرمانشاه":["اسلام آباد غرب","جوانرود","سنقر","صحنه","قصر شيرين","كرمانشاه","كنگاور","هرسين","پاوه"],"كهكيلويه و بويراحمد":["دهدشت","دوگنبدان","سي سخت","ياسوج","گچساران"],"گلستان":["آزاد شهر","آق قلا","راميان","علي آباد كتول","كردكوی","كلاله","گرگان","گنبد كاووس"],"گيلان":["آستارا","املش","تالش","رشت","رودبار","شفت","صومعه سرا","فومن","لاهیجان","لنگرود","ماسال","ماسوله","منجيل","هشتپر"],"لرستان":["ازنا","الشتر","اليگودرز","بروجرد","خرم آباد","دزفول","دورود","كوهدشت","ماهشهر","نور آباد"],"مازندران":["آمل","بابل","بابلسر","بلده","بهشهر","تنكابن","جويبار","رامسر","ساري","قائم شهر","محمود آباد","نكا","نور","نوشهر","چالوس"],"مركزي":["آشتيان","اراك","تفرش","خمين","دليجان","ساوه","شازند","محلات"],"هرمزگان":["بستك","بندر جاسك","بندر خمیر","بندر لنگه","بندرعباس","حاجي آباد","دهبارز","قشم","قشم","كيش","ميناب"],"همدان":["اسدآباد","بهار","رزن","ملاير","نهاوند","همدان"],"يزد":["ابركوه","اردكان","اشكذر","بافق","تفت","خضرآباد","زارچ","طبس","مهريز","ميبد","هرات","يزد"]};
// `data` should be filled with provinces and their cities in json format

$(document).ready(function() {
	$('.ir-province').each(loadProvinces);
	$('.ir-province').change(loadCities);
});

var loadProvinces = function() {
	var element = $(this);
	element.empty();
	element.append($('<option></option>').attr('value', 'empty'));
	$.each(data, function(province, list) {
		var option = $('<option></option>').attr('value', province).text(province);
		element.append(option);
	});
};

var loadCities = function() {
	var citySelector = $('.ir-city');
	var selectedProvince = $(this).val();
	var cityList = data[selectedProvince];

	citySelector.empty();

	$.each(cityList, function(index, city) {
		var option = $('<option></option>').attr('value', city).text(city);
		citySelector.append(option);
	});
};


$(document).ready(function () {
  $(window).scroll(function () {
    if ($(window).scrollTop() > 600) {
      $(".scroll_up").css({ opacity: "1", "pointer-events": "visible" });
    } else {
      $(".scroll_up").css({ opacity: "0", "pointer-events": "none" });
    }
  });
});

// upload preview
function readURL(input) {
    Progress();
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function(e) {
            $('#blah')
                .attr('src', e.target.result);
        };

        reader.readAsDataURL(input.files[0]);
    }
    Progress(false);
}