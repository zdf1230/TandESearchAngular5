import { Component, OnInit, ViewChild, Renderer2, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { AgmCoreModule, MapsAPILoader } from '@agm/core';
import { } from 'googlemaps';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  ipApiUrl = 'http://ip-api.com/json';
  serverUrl = 'http://localhost:3000/';
  error;
  currentLocation;

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
  resultTable = false;
  havePrevious = false;
  haveNext = false;
  next_page_token = '';

  constructor(private http: HttpClient, private renderer: Renderer2, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone) {
  }

  @ViewChild("keyword") keyword;
  @ViewChild("location") location;

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
    var searchLocation = this.currentLocation;
    if (searchForm.value["from"] == "other") {
      var locationUrl = this.serverUrl + 'location?location=' + searchForm.value['location'];
      await this.http.get(locationUrl).map(
        data => searchLocation = {
          lat: data['lat'],
          lng: data['lng']
        }
      ).toPromise();
    }
    var distance = searchForm.value["distance"] == '' ? 10 : searchForm.value["distance"];
    var placesUrl = this.serverUrl + 'place?lat=' + searchLocation.lat
      + '&lng=' + searchLocation.lng
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
              category: element['icon'],
              name: element['name'],
              address: element['vicinity'],
              id: element['id']
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
      },
      error => this.error = error
    );
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
                category: element['icon'],
                name: element['name'],
                address: element['vicinity'],
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
}
