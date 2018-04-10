import { Component, OnInit, ViewChild, Renderer2, NgZone, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { AgmCoreModule, MapsAPILoader } from '@agm/core';
import { } from 'googlemaps';
import { element } from 'protractor';
import 'rxjs/add/operator/catch';
import {Observable} from 'rxjs/Rx';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  private itemPerPage = 20;
  private ipApiUrl = 'http://ip-api.com/json';
  private serverUrl = 'http://localhost:3000/';
  error;
  currentLocation;
  searchLocation;

  currentLocationStatus = false;
  keywordStatus = false;
  searchButtonStatus = false;
  locationStatus = false;
  locationValidStatus = false;

  from = 'current';
  category = 'default';
  locationValue = '';
  places = [];
  placesDisplay = [];
  placesDisplayIndex = 0;
  havePrevious = false;
  haveNext = false;

  favorites = [];
  favoritesDisplay = [];
  favoritesDisplayIndex = 0;
  havePreviousFavorites = false;
  haveNextFavorites = false;

  resultTable = false;
  favoriteTable = false;
  next_page_token = '';

  detailsTab = false;
  detailsObject = {} as google.maps.places.PlaceResult;
  price_level;
  star_rating;
  todays_hours;
  todays_week;
  todaysHoursDisplay = [];

  noRecords = false;
  failedSearch = false;

  constructor(private http: HttpClient, private renderer: Renderer2, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, private changeDetector : ChangeDetectorRef) {
  }

  @ViewChild("keyword") keyword;
  @ViewChild("location") location;
  @ViewChild("distance") distance;
  @ViewChild("mapsTab") mapsTab;

  getCurrentLocation () {
    this.http.get(this.ipApiUrl).subscribe(
      data => {
        this.currentLocation = {
          lat: data['lat'],
          lng: data['lon']
        };
        this.currentLocationStatus = true;
      },
      error =>  {
        this.error = error;
        this.currentLocationStatus = false;
      }
    );
  }

  ngOnInit () {
    this.getCurrentLocation();

    this.mapsAPILoader.load().then(() => {
      let autocomplete = new google.maps.places.Autocomplete(this.location.nativeElement, {
        types: ["address"]
      });

      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          let place = autocomplete.getPlace();
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          this.locationValue = place.formatted_address;
        });
      });
    });
  }

  onKeyword(value) {
    if (!this.checkValdation(value)) {
      this.renderer.addClass(this.keyword.nativeElement, "is-invalid");
      this.keywordStatus = false;
      this.checkSearchButtonStatus();
    }
    else {
      this.renderer.removeClass(this.keyword.nativeElement, "is-invalid");
      this.keywordStatus = true;
      this.checkSearchButtonStatus();
    }
  }

  onLocation(value) {
    if (!this.checkValdation(value)) {
      this.renderer.addClass(this.location.nativeElement, "is-invalid");
      this.locationValidStatus = false;
      this.checkSearchButtonStatus();
    }
    else {
      this.renderer.removeClass(this.location.nativeElement, "is-invalid");
      this.locationValidStatus = true;
      this.checkSearchButtonStatus();
    }
  }

  disableLocation() {
    this.locationStatus = false;
    // clear error message
    this.renderer.removeClass(this.location.nativeElement, "is-invalid");
    this.location.nativeElement.value = '';
    this.checkSearchButtonStatus();
  }

  undisableLocation() {
    this.locationStatus = true;
    this.checkSearchButtonStatus();
  }

  private checkValdation(value) {
    if (value == null) {
      return true;
    }
    for (var i = 0; i < value.length; ++i) {
      if (value[i] != ' ') {
        return true;
      }
    }
    return false;
  }

  private checkSearchButtonStatus() {
    if (!this.locationStatus) {
      this.searchButtonStatus = this.currentLocationStatus && this.keywordStatus;
    }
    else {
      this.searchButtonStatus = this.currentLocationStatus && this.keywordStatus && this.locationValidStatus;
    }
  }

  async requestPlaces (searchForm : NgForm) {
    this.searchLocation = this.currentLocation;
    if (searchForm.value["from"] == "other") {
      var locationUrl = this.serverUrl + 'location?location=' + searchForm.value['location'];
      await this.http.get(locationUrl).map(
        data => this.searchLocation = {
          lat: data['lat'],
          lng: data['lng']
        }
      ).toPromise().catch(error => {
        this.error = error;
        console.log(this.error);
      });
    }
    var distance = searchForm.value["distance"] == '' ? 10 : searchForm.value["distance"];
    var placesUrl = this.serverUrl + 'place?lat=' + this.searchLocation.lat
      + '&lng=' + this.searchLocation.lng
      + '&distance=' + distance
      + '&category=' + searchForm.value["category"]
      + '&keyword=' + searchForm.value["keyword"];
    this.places = [];
    this.http.get(placesUrl).subscribe(
      data => {  
        var num = 0;
        this.placesDisplay = [];
        this.placesDisplayIndex = 0;
        this.havePrevious = false;
        data['results'].forEach(element => {   
          this.placesDisplay.push(
            {
              number: ++num,
              icon: element['icon'],
              name: element['name'],
              vicinity: element['vicinity'],
              place_id: element['place_id']
            }
          );
        });
        this.places.push(this.placesDisplay);
        if (data['next_page_token'] != null) {
          this.next_page_token = data['next_page_token'];
          this.haveNext = true;
        }
        else {
          this.next_page_token = '';
          this.haveNext = false;
        }
        this.resultTable = true;
        this.favoriteTable = false;
        if (this.placesDisplay.length == 0) {
          this.noRecords = true;
        }
        else {
          this.noRecords = false;
        }
        this.detailsTab = false;
        this.failedSearch = false;
      },
      error => {
        this.error = error;
        console.log(this.error);
        this.resultTable = true;
        this.favoriteTable = false;
        this.detailsTab = false;
        this.noRecords = false;
        this.failedSearch = true;
      }
    );
  }

  onClear() {
    this.keywordStatus = false;
    this.searchButtonStatus = false;
    this.locationStatus = false;
    this.locationValidStatus = false;

    this.from = 'current';
    this.category = 'default';
    this.locationValue = '';
    this.places = [];
    this.placesDisplay = [];
    this.placesDisplayIndex = 0;
    this.havePrevious = false;
    this.haveNext = false;

    this.favorites = [];
    this.favoritesDisplay = [];
    this.favoritesDisplayIndex = 0;
    this.havePreviousFavorites = false;
    this.haveNextFavorites = false;

    this.resultTable = false;
    this.favoriteTable = false;
    this.detailsTab = false;
    this.next_page_token = '';

    this.renderer.removeClass(this.keyword.nativeElement, "is-invalid");
    this.renderer.removeClass(this.location.nativeElement, "is-invalid");

    this.keyword.nativeElement.value = '';
    this.location.nativeElement.value = '';
    this.distance.nativeElement.value = '';

    this.noRecords = false;
    this.failedSearch = false;
  }

  onPrevious() {
    this.haveNext = true;
    this.placesDisplay = this.places[--this.placesDisplayIndex];
    if (this.placesDisplayIndex == 0) {
      this.havePrevious = false;
    }
  }

  onNext() {
    if (this.placesDisplayIndex < this.places.length - 1) {
      this.havePrevious = true;
      this.placesDisplay = this.places[++this.placesDisplayIndex];
      if (this.placesDisplayIndex == this.places.length - 1) {
        this.haveNext = false;
      }
    }
    else {
      var placesUrl = this.serverUrl + 'moreplaces?next_page_token=' + this.next_page_token;
      this.http.get(placesUrl).subscribe(
        data => {  
          var num = 0;
          this.placesDisplay = [];
          ++this.placesDisplayIndex;
          data['results'].forEach(element => {   
            this.placesDisplay.push(
              {
                number: ++num,
                icon: element['icon'],
                name: element['name'],
                vicinity: element['vicinity'],
                place_id: element['place_id']
              }
            );
          });
          this.places.push(this.placesDisplay);
          // for button appearing simultaneously.
          this.havePrevious = true;
          if (data['next_page_token'] != null) {
            this.next_page_token = data['next_page_token'];
            this.haveNext = true;
          }
          else {
            this.next_page_token = '';
            this.haveNext = false;
          }
          this.resultTable = true;
        },
        error => this.error = error
      )
    }
  }

  onResults() {
    this.resultTable = true;
    this.favoriteTable = false;
    if (this.placesDisplay.length == 0) {
      this.noRecords = true;
    }
    else {
      this.noRecords = false;
    }
    this.failedSearch = false;
  }

  onFavorites() {
    this.resultTable = false;
    this.favoriteTable = true;
    if (localStorage.favorite) {
      // it needs update only if the array favorites is empty.
      if (this.favorites.length == 0) {
        this.favoritesDisplayIndex = 0;
        this.updateFavorites();
      }
      this.noRecords = false;
    }
    else {
      //alert
      this.noRecords = true;
    }
    this.failedSearch = false;
  }

  onFavoritesPrevious() {
    this.haveNextFavorites = true;
    this.favoritesDisplay = this.favorites[--this.favoritesDisplayIndex];
    if (this.favoritesDisplayIndex == 0) {
      this.havePreviousFavorites = false;
    }
  }

  onFavoritesNext() {
    this.havePreviousFavorites = true;
    this.favoritesDisplay = this.favorites[++this.favoritesDisplayIndex];
    if (this.favoritesDisplayIndex == this.favorites.length - 1) {
      this.haveNextFavorites = false;
    }
  }

  updateFavorites() {
    if (localStorage.favorite) {
      var num = 0;
      // delete the last element in current page(except the first page).
      if (this.favoritesDisplayIndex > 0 
        && this.favorites.length <= this.favoritesDisplayIndex * this.itemPerPage) {
        --this.favoritesDisplayIndex;
      }
      this.favoritesDisplay = [];
      this.favorites = [];
      var favoritesJSON = JSON.parse(localStorage.favorite);
      console.log(favoritesJSON);
      console.log(localStorage.favorite);
      favoritesJSON.forEach(id => {
        var element = JSON.parse(localStorage[id]);
        if (++num > this.itemPerPage) {
          num = 1;
        }
        this.favoritesDisplay.push(
          {
            number: num,
            icon: element['icon'],
            name: element['name'],
            vicinity: element['vicinity'],
            place_id: element['place_id']
          }
        );
        if (num == this.itemPerPage) {
          this.favorites.push(this.favoritesDisplay);
          this.favoritesDisplay = [];
        }
      });
      if (this.favoritesDisplay.length != 0) {
        this.favorites.push(this.favoritesDisplay);
      }
      this.favoritesDisplay = this.favorites[this.favoritesDisplayIndex];
      if (this.favoritesDisplayIndex > 0) {
        this.havePreviousFavorites = true;
      }
      else {
        this.havePreviousFavorites = false;
      }
      if (this.favoritesDisplayIndex < this.favorites.length - 1) {
        this.haveNextFavorites = true;
      }
      else {
        this.haveNextFavorites = false;
      }
      this.noRecords = false;
    }
    else {
      // alert only if on favorite page
      if (this.favoriteTable) {
        this.noRecords = true;
      }
    }
  }

  onFavoriteStar(id, obj) {
    var content = [];
    if (localStorage.favorite) {
      var contentJSON = localStorage.favorite;
      content = JSON.parse(contentJSON);
    }
    content.push(id);
    localStorage.favorite = JSON.stringify(content);
    localStorage[id] = JSON.stringify(obj);
    this.updateFavorites();
  }

  deleteFavoriteStar(id) {
    var content = [];
    if (localStorage.favorite) {
      var contentJSON = localStorage.favorite;
      content = JSON.parse(contentJSON);
    }
    var index = content.indexOf(id);
    content.splice(index, 1);
    if (content.length == 0) {
      localStorage.removeItem("favorite");
    }
    else {
      localStorage.favorite = JSON.stringify(content);
    }
    localStorage.removeItem(id);
    this.updateFavorites();
  }

  checkExists(id) {
    return localStorage[id] || false;
  }

  onDetails(id) {
    this.detailsTab = true;
    this.changeDetector.detectChanges();
    var map = new google.maps.Map(this.mapsTab.nativeElement, {
      center: this.searchLocation,
      zoom: 17
    });
    var request = {
      placeId: id
    };
    var service = new google.maps.places.PlacesService(map);
    service.getDetails(request, (place, status) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        this.detailsObject = Object.assign({}, place);
        console.log(this.detailsObject);
        this.price_level = Array(this.detailsObject.price_level);
        this.star_rating = this.detailsObject.rating * 20 + "%";
        var dayOfWeek = parseInt(moment().utcOffset(this.detailsObject.utc_offset).format('E'));
        var openingHours = this.detailsObject.opening_hours.weekday_text;
        this.todays_hours = openingHours[dayOfWeek - 1].substr(openingHours[dayOfWeek - 1].indexOf(' '));
        this.todays_week = openingHours[dayOfWeek - 1].substr(0, openingHours[dayOfWeek - 1].indexOf(':'));
        this.todaysHoursDisplay = [];
        for (var i = dayOfWeek; i < openingHours.length; ++i) {
          this.todaysHoursDisplay.push({
            hours: openingHours[i].substr(openingHours[i].indexOf(' ')),
            week: openingHours[i].substr(0, openingHours[i].indexOf(':'))
          });
        }
        for (var i = 0; i < dayOfWeek - 1; ++i) {
          this.todaysHoursDisplay.push({
            hours: openingHours[i].substr(openingHours[i].indexOf(' ')),
            week: openingHours[i].substr(0, openingHours[i].indexOf(':'))
          });
        }
        console.log(this.todaysHoursDisplay);
        this.changeDetector.detectChanges();
      }
    });
  }

  onList() {
    this.detailsTab = false;
  }
}
