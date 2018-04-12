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
  photos = [];
  photos_col0 = [];
  photos_col1 = [];
  photos_col2 = [];
  photos_col3 = [];
  reviewsDisplay = [];

  toLocationValue = '';
  travelMode = 'DRIVING';
  mapTabSelected = false;
  map;
  pegman;
  panorama;
  fromLocationValue = '';
  directionsService;
  directionsDisplay;

  noRecords = false;
  failedSearch = false;

  constructor(private http: HttpClient, private renderer: Renderer2, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, private changeDetector : ChangeDetectorRef) {
  }

  @ViewChild("keyword") keyword;
  @ViewChild("location") location;
  @ViewChild("distance") distance;
  @ViewChild("mapsTab") mapsTab;
  @ViewChild("fromlocation") fromlocation;
  @ViewChild("directionsPanel") directionsPanel;
  @ViewChild("reviewsDropdown") reviewsDropdown;
  @ViewChild("orderDropdown") orderDropdown;

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
      this.map = new google.maps.Map(this.mapsTab.nativeElement, {
        center: this.currentLocation,
        zoom: 15
      });

      this.directionsService = new google.maps.DirectionsService();
      this.directionsDisplay = new google.maps.DirectionsRenderer();

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
        this.mapTabSelected = false;
      },
      error => {
        this.error = error;
        console.log(this.error);
        this.resultTable = true;
        this.favoriteTable = false;
        this.detailsTab = false;
        this.noRecords = false;
        this.failedSearch = true;
        this.mapTabSelected = false;
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

    this.mapTabSelected = false;

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
    this.detailsTab = false;
    this.mapTabSelected = false;
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
    this.detailsTab = false;
    this.mapTabSelected = false;
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

    var request = {
      placeId: id
    };
    var service = new google.maps.places.PlacesService(this.map);
    service.getDetails(request, (place, status) => {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        this.detailsObject = Object.assign({}, place);
        console.log(this.detailsObject);
        this.price_level = Array(this.detailsObject.price_level);
        this.star_rating = this.detailsObject.rating * 20 + "%";
        if (this.detailsObject.opening_hours) {
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
        }
        this.photos = [];
        this.photos_col0 = [];
        this.photos_col1 = [];
        this.photos_col2 = [];
        this.photos_col3 = [];
        if (this.detailsObject.photos) {
          this.detailsObject.photos.forEach(photo => {
            this.photos.push(photo.getUrl({'maxWidth': photo.width}));
          });
          for (var i = 0; i < this.detailsObject.photos.length; ++i) {
            if (i % 4 == 0) {
              this.photos_col0.push(this.detailsObject.photos[i].getUrl({'maxWidth': this.detailsObject.photos[i].width}));
            }
            if (i % 4 == 1) {
              this.photos_col1.push(this.detailsObject.photos[i].getUrl({'maxWidth': this.detailsObject.photos[i].width}));
            }
            if (i % 4 == 2) {
              this.photos_col2.push(this.detailsObject.photos[i].getUrl({'maxWidth': this.detailsObject.photos[i].width}));
            }
            if (i % 4 == 3) {
              this.photos_col3.push(this.detailsObject.photos[i].getUrl({'maxWidth': this.detailsObject.photos[i].width}));
            }
          }
        }
        this.toLocationValue = this.detailsObject.name + ", " + this.detailsObject.formatted_address;
        this.travelMode = 'DRIVING';
        this.changeDetector.detectChanges();
        this.reviewsDisplay = [];
        if (this.detailsObject.reviews) {
          var reviews;
          reviews = this.detailsObject.reviews;
          var num = 0;
          reviews.forEach((review) => {
            this.reviewsDisplay.push({
              review: review,
              time: moment(review.time * 1000).format('YYYY-MM-DD HH:mm:ss'),
              rating: Array(review.rating),
              order: num++
            });
          });
        }
      }
    });
  }

  onGoogleReviews() {
    this.reviewsDropdown.nativeElement.innerText = "Google Reviews";
    this.reviewsDisplay = [];
    if (this.detailsObject.reviews) {
      var reviews;
      reviews = this.detailsObject.reviews;
      var num = 0;
      reviews.forEach((review) => {
        this.reviewsDisplay.push({
          review: review,
          time: moment(review.time * 1000).format('YYYY-MM-DD HH:mm:ss'),
          rating: Array(review.rating),
          order: num++
        });
      });
    }
  }

  onYelpReviews() {
    this.reviewsDropdown.nativeElement.innerText = "Yelp Reviews";
    var city;
    var state;
    var country;
    this.detailsObject.address_components.forEach((addr) => {
      if (addr.types.includes('administrative_area_level_2')) {
        city = addr.long_name;
      }
      if (addr.types.includes('administrative_area_level_1')) {
        state = addr.short_name;
      }
      if (addr.types.includes('country')) {
        country = addr.short_name;
      }
    });
    var yelpUrl = this.serverUrl + 'yelpreviews?name=' + this.detailsObject.name
      + '&address1=' + this.detailsObject.formatted_address
      + '&city=' + city
      + '&state=' + state
      + '&country=' + country
      + '&latitude=' + this.detailsObject.geometry.location.lat()
      + '&longtitude=' + this.detailsObject.geometry.location.lng();
    this.reviewsDisplay = [];
    this.http.get(yelpUrl).subscribe(
      data => {
        var num = 0;
        data['reviews'].forEach((yelp) => {
          var review = {
            author_url: yelp.url,
            image_url: yelp.user.image_url,
            author_name: yelp.user.name,
            text: yelp.text,
            rating: yelp.rating,
            time: moment(yelp.time_created).unix()
          };
          this.reviewsDisplay.push({
            review: review,
            time: yelp.time_created,
            rating: Array(yelp.rating),
            order: num++
          });
        });
      },
      error => this.error = error
    );
  }

  onDefaultOrder() {
    this.reviewsDisplay.sort(this.defaultOrder);
    this.orderDropdown.nativeElement.innerText = "Default Order";
  }

  defaultOrder(a, b) {
    return a.order < b.order ? -1 : 1;
  }

  onHighestRating() {
    this.reviewsDisplay.sort(this.highestRating);
    this.orderDropdown.nativeElement.innerText = "Highest Rating";
  }

  highestRating(a, b) {
    return a.review.rating > b.review.rating ? -1 : 1;
  }

  onLowestRating() {
    this.reviewsDisplay.sort(this.lowestRating);
    this.orderDropdown.nativeElement.innerText = "Lowest Rating";
  }

  lowestRating(a, b) {
    return a.review.rating < b.review.rating ? -1 : 1;
  }

  onMostRecent() {
    this.reviewsDisplay.sort(this.mostRecent);
    this.orderDropdown.nativeElement.innerText = "Most Recent";
  }

  mostRecent(a, b) {
    return a.review.time > b.review.time ? -1 : 1;
  }

  onLeastRecent() {
    this.reviewsDisplay.sort(this.leastRecent);
    this.orderDropdown.nativeElement.innerText = "Least Recent";
  }

  leastRecent(a, b) {
    return a.review.time < b.review.time ? -1 : 1;
  }

  onList() {
    this.detailsTab = false;
    this.mapTabSelected = false;
  }

  onMapTab() {
    this.pegman = true;
    this.mapTabSelected = true;
    this.changeDetector.detectChanges();
    // when the map tab display : block, refresh the map
    google.maps.event.trigger(this.map, 'resize');

    // clear map first
    this.directionsDisplay.setMap(null);
    this.directionsDisplay.setPanel(null);

    this.map.setCenter(this.detailsObject.geometry.location);
    var marker = new google.maps.Marker({
      position: this.detailsObject.geometry.location
    });
    marker.setMap(this.map);
    this.panorama = this.map.getStreetView();
    this.panorama.setPosition(this.detailsObject.geometry.location);
    this.panorama.setOptions({
      enableCloseButton: false
    });

    var autocomplete = new google.maps.places.Autocomplete(this.fromlocation.nativeElement, {
      types: ["address"]
    });

    autocomplete.addListener("place_changed", () => {
      this.ngZone.run(() => {
        let place = autocomplete.getPlace();
        if (place.geometry === undefined || place.geometry === null) {
          return;
        }
        this.fromLocationValue = place.formatted_address;
      });
    });
  }

  onPegmanIcon() {
    this.pegman = false;
    if (!this.panorama.getVisible()) {
      this.panorama.setVisible(true);
    }
  }

  onMapIcon() {
    this.pegman = true;
    if (this.panorama.getVisible()) {
      this.panorama.setVisible(false);
    }
  }

  async onGetDirections(directionsForm : NgForm) {
    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.setPanel(this.directionsPanel.nativeElement);
    var origin;
    if (directionsForm.value['fromlocation'] == '') {
      origin = this.currentLocation;
    }
    else {
      var locationUrl = this.serverUrl + 'location?location=' + directionsForm.value['fromlocation'];
      await this.http.get(locationUrl).map(
        data => origin = {
          lat: data['lat'],
          lng: data['lng']
        }
      ).toPromise().catch(error => {
        this.error = error;
        origin = directionsForm.value['fromlocation'];
      });
    }
    
    var request = {
      origin: origin,
      destination: this.detailsObject.geometry.location,
      travelMode: directionsForm.value['travel_mode'],
      provideRouteAlternatives: true
    };
    console.log(request);
    this.directionsService.route(request, (response, status) => {
      if (status == google.maps.DirectionsStatus.OK) {
        this.directionsDisplay.setDirections(response);
      }
    });
  }

  imgError(image){
    image.parentNode.parentNode.style.display = 'none';
  }
}
