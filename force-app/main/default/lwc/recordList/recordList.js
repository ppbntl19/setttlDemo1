import { LightningElement, api, wire } from "lwc";
import {  getObjectInfos ,getPicklistValues} from "lightning/uiObjectInfoApi";
import { NavigationMixin } from "lightning/navigation";
import getFilterConfigMetadata from "@salesforce/apex/RecordListController.getFilterConfigMetadata";
import isObjectExist from "@salesforce/apex/RecordListController.isObjectExist";
import getRecordList from "@salesforce/apex/RecordListController.getRecordList";

export default class RecordList extends NavigationMixin(LightningElement) {
  //Component configuration
  @api title;

  filterConfigs =  {};
  objectApiNames;
  selectedObjectName;
  selectedfieldName;
  selectedOperator;
  objectMetaData= {};
  defaultRecordTypeId;
  pickListFieldName;
  


  errorData = {
    error: false,
    message: " ",
  };

  data = [];;


  
  // called when the relationship map is connected
  connectedCallback() {
    //Get metadata
    getFilterConfigMetadata()
    .then((result) => {
        result = result || [];
        //find correct preview setting
        result.forEach((item) => {
            if(item && item.Object_Api_Name__c){
                this.filterConfigs[item.Object_Api_Name__c] =  {
                    fields : item.Fields_Api_Name__c.split(',')
                };
            }
        })
        //Get array
        let objectApiNames = Object.keys(this.filterConfigs) || [];
        //Trim items
        objectApiNames = objectApiNames.map((string) => string.trim());
        //Check if item exisnt in array
        if (objectApiNames && objectApiNames.length) {
        //Check if object names valid-apex call
        isObjectExist({ objectApiNames })
            .then((result) => {
                if (result.length) {
                    //Show error notification
                    this.errorData.error = true;
                    this.errorData.message = "Invalid Object Names " + result;
                } else {
                    //Set object names and get metadata info
                    this.objectApiNames =  objectApiNames;
                }
            })
            .catch((error) => {
              //Show error
              console.log(error);
              //Show error notification
              this.errorData.error = true;
              this.errorData.message = "Error- Try refreshing the page ";
            });
        }
    })
    .catch((error) => {
        console.log(error);
    })
    .finally(() => {
        this.isLoading = false;
    });

  }

  // get metdata for multiple objects sent via the childObjectApiNames variable
  @wire(getObjectInfos, { objectApiNames: "$objectApiNames" })
  onObjectInfosRecived(response) {
    if (!response.data) return;
    // Get child objects info for all object
    response.data.results.forEach((data) => {
      let childs;
      if (data && data.statusCode === 200 && data.result && data.result.apiName) {
        //Get name field
        let nameField = Object.values(data.result.fields).find((o) => o.nameField === true);
        nameField = nameField ? nameField.apiName : data.result.nameFields[0];
        nameField = data.result.nameFields.includes("Name") ? "Name" : nameField;
        this.defaultRecordTypeId = data.result.defaultRecordTypeId;

        this.objectMetaData[data.result.apiName] = {
          label: data.result.label,
          nameField: nameField,
          fields: data.result.fields
        };
      }
    });
  }

  @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: '$pickListFieldName' })
  picklistResults({ error, data }) {
    if (data) {
      this.currentPickList = data.values;
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.currentPickList = undefined;
    }
  }

  get objectOptions() {
    let options = [{ label: "choose one...", value: "" }];
    this.objectApiNames && this.objectApiNames.forEach( item => {
        options.push({ label: item, value: item },)
    })
    return options;
  }

  get fieldOptions() {
    let options = [{ label: "choose one...", value: "" }];
    if(this.selectedObjectName){
        if(this.filterConfigs[this.selectedObjectName]){
            this.filterConfigs[this.selectedObjectName].fields.forEach(item => {
                options.push({label: item, value: item})
            })
        }
    }
    return options;
  }
  get operatorOptions() {
    let dataType  = this.selectedFieldDataType;
    let operators = [{ label: "Equal To", value: "=" }];
    if(['String','Picklist', 'Reference'].includes(dataType)){
        operators.push({ label: "Not Equal To", value: "!=" });
    } else if(['Currency','Int'].includes(dataType)){
        operators.push({ label: "Greatter Then", value: ">" },{ label: "Less Then", value: "<" });
    }
    if(dataType == 'Picklist' ){
      this.pickListFieldName = this.selectedObjectName+'.'+this.selectedfieldName;
    }
    if(dataType == 'Reference' ){
      this.relationshipObjectName = this.selectedfieldName;
    }
    //Return based on type of field
    return operators;
  }


  get selectedFieldDataType(){
    let dataType= this.selectedObjectName && this.selectedfieldName && this.objectMetaData[this.selectedObjectName].fields[this.selectedfieldName] && this.objectMetaData[this.selectedObjectName].fields[this.selectedfieldName].dataType;
    return dataType;
  }

  // get pickListFieldName(){
  //   let dataType= this.selectedFieldDataType ;
  //   if(dataType == 'Picklist' ){
  //     return this.selectedfieldName;
  //   } else {
  //     return false;
  //   }
  // }

  get getRelationShipname(){
    let dataType= this.selectedFieldDataType ;
    if(dataType == 'Reference' ){
      return this.selectedObjectName && this.selectedfieldName && this.objectMetaData[this.selectedObjectName].fields[this.selectedfieldName] && this.objectMetaData[this.selectedObjectName].fields[this.selectedfieldName].referenceToInfos[0].apiName;
    } else {
      return false;
    }
  }

  get columns(){
    const columns = [];
    if(this.filterConfigs[this.selectedObjectName]){
        this.filterConfigs[this.selectedObjectName].fields.forEach(item => {
            columns.push({label: item, fieldName: item})
        })
    }
    return columns;
  }


  onObjectNameChange(event) {
    this.selectedObjectName = event.detail.value;
    this.selectedfieldName = '';
    this.selectedOperator = '';
    this.fieldValue = '';

  }
  onFieldChange(event) {
    this.selectedfieldName = event.detail.value;
    this.selectedOperator = '';
    this.fieldValue = '';
  }
  handleOpertatorChange(event) {
    this.selectedOperator = event.detail.value;
    this.fieldValue = '';
  }

  handleChange(event){
    if(this.isLookupField){
      this.fieldValue = event.detail.recordId;
    } else {
      this.fieldValue =  event.detail.value 
    }
    //get records
    this.recordsList();
  }
  
  get isLookupField(){
    return this.selectedFieldDataType == 'Reference';
  }

  get isPickList (){
    return  this.selectedFieldDataType == 'Picklist';
  }

  get isNumber(){
    return this.selectedFieldDataType == 'Int';
  }

  get isCurrency(){
    return this.selectedFieldDataType == 'Currency';
  }

  recordsList(){
    this.data =  [];
    if(this.fieldValue && this.selectedObjectName && this.selectedOperator && this.selectedfieldName){
      getRecordList({ objectApiName: this.selectedObjectName, operator :this.selectedOperator, fieldName : this.selectedfieldName, fieldValue : this.fieldValue, dataType : this.selectedFieldDataType })
      .then((result) => {
          if (result.length) {
            this.data =  result;
          }
      })
      .catch((error) => {
        //Show error
        console.log(error);
        //Show error notification
        this.errorData.error = true;
        this.errorData.message = "Error- Try refreshing the page ";
      });
    }
  }

}
