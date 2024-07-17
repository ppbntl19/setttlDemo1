public inherited sharing class RecordListController {

    /**
     * @description return metadata for Record_List_Filter_Configuration__mdt
    **/
    @AuraEnabled(cacheable=true)
    public static List<Record_List_Filter_Configuration__mdt> getFilterConfigMetadata(){
        try {
            // Return metadata for Record_List_Filter_Configuration__mdt
            return [
            SELECT
            Fields_Api_Name__c,
            Object_Api_Name__c
            FROM Record_List_Filter_Configuration__mdt WITH SECURITY_ENFORCED
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
   * @description Check if a object is valid or not
   **/
  @AuraEnabled(cacheable=true)
  public static List<String> isObjectExist(List<String> objectApiNames) {
    List<String> response = new List<String>();
    Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
    for (String obj : objectApiNames) {
      /* sfge-disable-next-line AvoidMultipleMassSchemaLookups */
      if (!gd.containsKey(obj.trim())) {
        response.add(obj);
      }
    }
    return response;
  }


  @AuraEnabled(cacheable=true)
  public static List<sObject> getRecordList(String objectApiName, String operator, String fieldName, Object fieldValue, String dataType) {
    try {
      String myQuery = null;
      if (fieldValue != null) {
        if(dataType == 'Int'){
          fieldValue = Integer.valueOf(fieldValue);
        }
        if(dataType == 'Currency'){
          fieldValue = Decimal.valueOf((String)fieldValue);
        }
        
        myQuery =
          'Select FIELDS(STANDARD)' +
          '  from ' +
          String.escapeSingleQuotes(objectApiName) +
          ' Where '+ String.escapeSingleQuotes(fieldName) +' '+ operator+ ' :fieldValue LIMIT  100';
      } 
      List<sObject> lookUpList;
      Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
      if(   globalDescribe.get(objectApiName).getDescribe().isAccessible() ) {
        lookUpList = Database.query(myQuery, AccessLevel.USER_MODE);
      } else {
        throw new AuraHandledException('The user  does not have the required CRUD/FLS permissions');
      }
      
      return lookUpList;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }


}