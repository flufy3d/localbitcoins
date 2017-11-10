var express = require('express');
var cheerio = require('cheerio');
var superagent = require('superagent');


var app = express();
var result = {};
result.lbc_buy_list = [];
result.lbc_sell_list = [];
update_interval = 10000;
var count_down = 100;
var show_count = 6;

app.set('view engine', 'jade')


function update_usd_in_cny() {

    count_down = count_down - 1;
    if (count_down <= 0) return;

    superagent.get('http://api.fixer.io/latest?base=USD;symbols=CNY')
      .buffer(true)
      .end(function (err, sres) {
        if (err) {
          //return next(err);
           console.log('get api.fixer.io data timeout!');
          return;
        }

        json_data = JSON.parse(sres.text);
        result.usd_in_cny = json_data['rates']['CNY'];
    });
}

setInterval(update_usd_in_cny, update_interval);
update_usd_in_cny();


function update_market_price() {
    count_down = count_down - 1;
    if (count_down <= 0) return;

    superagent.get('https://www.bitstamp.net/api/v2/ticker/btcusd/')
          .buffer(true)
          .end(function (err, sres) {
            if (err) {
                //return next(err);
                console.log('get www.bitstamp.net data timeout!');
                result.bid_usd = 0;
                result.ask_usd = 0;

                result.bid_cny = 0;
                result.ask_cny = 0;
              return;
            }

            json_data = JSON.parse(sres.text);
            result.bid_usd = json_data['bid'];
            result.ask_usd = json_data['ask'];

            result.bid_cny = (result.bid_usd*result.usd_in_cny).toFixed(2);
            result.ask_cny = (result.ask_usd*result.usd_in_cny).toFixed(2);


        });

}

setInterval(update_market_price, update_interval);
update_market_price();


function update_lbc_buy() {
    count_down = count_down - 1;
    if (count_down <= 0) return;
    superagent.get('https://localbitcoins.com/buy-bitcoins-online/cn/china/.json')
      .buffer(true)
      .end(function (err, sres) {
        if (err) {
          //return next(err);
           console.log('get localbitcoins.com data timeout!');
          return;
        }

        json_data = JSON.parse(sres.text);
        ad_list = json_data.data.ad_list;

        result.lbc_buy_list = [];

        _prev_name_list = {};

        _count = 0;
        for (var i = 0; i < ad_list.length; i++) {
            
            ads = ad_list[i].data;
            item = {};
            item.username = ads.profile.username;

            item.method = ads.online_provider;
            item.price = ads.temp_price;
            item.rprice = (ads.temp_price*0.99).toFixed(2);
            item.profit = ((item.rprice - result.ask_cny)/result.ask_cny*100).toFixed(2) + '%';
            item.currency = ads.currency;
            item.range = ads.min_amount + '-' + ads.max_amount_available;
            if (!(item.username in _prev_name_list) && ads.max_amount_available > ads.min_amount && ads.currency == 'CNY') {
              _count += 1;
              result.lbc_buy_list.push(item);

            }
            if (_count>=show_count) {break;}

            _prev_name_list[item.username] = 1;
        }

    });

}
setInterval(update_lbc_buy, update_interval);
update_lbc_buy();


function update_lbc_sell() {
    count_down = count_down - 1;
    if (count_down <= 0) return;
    superagent.get('https://localbitcoins.com/sell-bitcoins-online/cn/china/.json')
      .buffer(true)
      .end(function (err, sres) {
        if (err) {
          //return next(err);
           console.log('get localbitcoins.com data timeout!');
          return;
        }

        json_data = JSON.parse(sres.text);
        ad_list = json_data.data.ad_list;

        result.lbc_sell_list = [];

        _count=0;
        _prev_name_list = {};

        for (var i = 0; i < ad_list.length; i++) {
            ads = ad_list[i].data;
            item = {};
            item.username = ads.profile.username;
           
            item.method = ads.online_provider;
            item.price = ads.temp_price;
            item.rprice = (ads.temp_price*1.01).toFixed(2);
            item.profit = ((result.bid_cny - item.rprice)/result.bid_cny*100).toFixed(2) + '%';
            item.currency = ads.currency;
            item.range = ads.min_amount + '-' + ads.max_amount_available;

            if (!(item.username in _prev_name_list) && ads.max_amount_available > ads.min_amount && ads.currency == 'CNY') {
              _count += 1;
              result.lbc_sell_list.push(item);

            }
            if (_count>=show_count) {break;}

             _prev_name_list[item.username] = 1;



        }

    });
}
setInterval(update_lbc_sell, update_interval);
update_lbc_sell();



app.get('/', function (req, res,next) {





    res.render('index', { title: 'Localbitcoins Costing ', message: result ,count_down});
    count_down =  100;

});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
